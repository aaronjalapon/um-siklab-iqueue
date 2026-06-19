"""Rebooking flow actions for the IQueue chatbot.

Implements the multi-turn state machine for rebooking a missed bus:
  1. Identify — find the passenger's missed booking
  2. Find alternatives — query buses on same route with available seats
  3. Assign — cancel old booking, create new booking, get seat
  4. Confirm — return confirmation with new booking details and QR

Flow state is tracked in ChatMessage.metadata JSONB field.
"""

from __future__ import annotations

import logging
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingStatus
from app.models.bus import Bus
from app.models.bus_route import BusRoute
from app.models.passenger import Passenger

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Flow steps
# ---------------------------------------------------------------------------

STEP_IDENTIFY = "identify"
STEP_FIND_ALTERNATIVES = "find_alternatives"
STEP_SELECT = "select"
STEP_CONFIRM = "confirm"

# ---------------------------------------------------------------------------
# Response templates per step per language
# ---------------------------------------------------------------------------

RESPONSES: dict[str, dict[str, dict[str, str]]] = {
    "identify": {
        "ask_phone": {
            "en": "I can help you rebook! To find your booking, please provide your booking ID or the phone number you used when booking.",
            "fil": "Matutulungan kitang mag-rebook! Para mahanap ang booking mo, pakibigay ang iyong booking ID o ang numero ng telepono na ginamit mo.",
            "id": "Saya bisa membantu Anda memesan ulang! Untuk menemukan pemesanan Anda, silakan berikan ID pemesanan atau nomor telepon yang digunakan.",
            "vi": "Tôi có thể giúp bạn đặt lại! Để tìm đặt vé của bạn, vui lòng cung cấp mã đặt vé hoặc số điện thoại đã dùng.",
        },
        "found": {
            "en": "Found your booking: seat {seat} on Bus {plate} ({date}). Status: {status}. Let me find the next available bus on the {origin} → {destination} route.",
            "fil": "Nakita ko ang booking mo: upuan {seat} sa Bus {plate} ({date}). Status: {status}. Hahanap ako ng susunod na available na bus sa rutang {origin} → {destination}.",
        },
        "not_found": {
            "en": "I couldn't find a booking with that information. Please double-check and try again, or type 'cancel' to stop.",
            "fil": "Hindi ko mahanap ang booking. Pakitingnan muli at subukan ulit, o i-type ang 'cancel' para tumigil.",
        },
        "not_missed": {
            "en": "Your booking is {status}, not missed or cancelled. You don't need to rebook. Is there something else I can help with?",
            "fil": "Ang iyong booking ay {status}, hindi missed o cancelled. Hindi mo kailangang mag-rebook. May iba pa ba akong maitutulong?",
        },
    },
    "find_alternatives": {
        "no_buses": {
            "en": "Unfortunately, there are no more buses on the {origin} → {destination} route today. Would you like me to check tomorrow?",
            "fil": "Sa kasamaang palad, wala nang bus sa rutang {origin} → {destination} ngayong araw. Gusto mo bang tingnan ko bukas?",
        },
        "found_buses": {
            "en": "Here are the next available buses:\n{bus_list}\n\nWhich one would you like? (Reply with the plate number or '1', '2', etc.)",
            "fil": "Ito ang mga susunod na available na bus:\n{bus_list}\n\nAlin ang gusto mo? (I-reply ang plate number o '1', '2', atbp.)",
        },
    },
    "select": {
        "confirm": {
            "en": "You selected Bus {plate}. I'll cancel your old booking and book you a seat. Shall I proceed? (Reply 'yes' or 'no')",
            "fil": "Pinili mo ang Bus {plate}. Kakanselahin ko ang lumang booking mo at magbu-book ng upuan para sa iyo. Itutuloy ba? (I-reply ang 'oo' o 'hindi')",
        },
    },
    "confirm": {
        "success": {
            "en": "Done! You're rebooked on Bus {plate}, seat {seat}. Boarding window: {window_start} → {window_end}. Your QR code has been generated. Have a safe trip!",
            "fil": "Tapos na! Naka-rebook ka na sa Bus {plate}, upuan {seat}. Oras ng pagsakay: {window_start} → {window_end}. Nagawa na ang QR code mo. Ligtas na byahe!",
        },
        "cancelled": {
            "en": "Rebooking cancelled. Your original booking is unchanged. How else can I help?",
            "fil": "Nakansela ang rebooking. Hindi nabago ang orihinal mong booking. Paano pa ako makakatulong?",
        },
    },
}


# ============================================================================
# RebookingFlow
# ============================================================================


class RebookingFlow:
    """Multi-turn state machine for bus rebooking.

    Each turn advances through: identify → find_alternatives → select → confirm.
    State is persisted in session message metadata so it survives across API calls.
    """

    # ------------------------------------------------------------------
    # Main entrypoint — process one turn of the flow
    # ------------------------------------------------------------------

    @staticmethod
    async def process_turn(
        db: AsyncSession,
        session_id: uuid.UUID,
        query: str,
        language: str,
        flow_state: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Process one turn of the rebooking flow.

        Args:
            db: Database session.
            session_id: Chat session ID.
            query: User's current message.
            language: Detected language.
            flow_state: Current flow state from session metadata (or None to start).

        Returns:
            Dict with: response_text, flow_metadata (for session storage),
            is_complete (bool).
        """
        step = flow_state.get("step", STEP_IDENTIFY) if flow_state else STEP_IDENTIFY
        state = (flow_state or {}).copy()

        if step == STEP_IDENTIFY:
            return await RebookingFlow._step_identify(
                db, session_id, query, language, state,
            )
        elif step == STEP_FIND_ALTERNATIVES:
            return await RebookingFlow._step_find_alternatives(
                db, query, language, state,
            )
        elif step == STEP_SELECT:
            return await RebookingFlow._step_select(
                db, query, language, state,
            )
        elif step == STEP_CONFIRM:
            return await RebookingFlow._step_confirm(
                db, query, language, state,
            )
        else:
            # Unknown step — restart
            return await RebookingFlow._step_identify(
                db, session_id, query, language, {"step": STEP_IDENTIFY},
            )

    # ------------------------------------------------------------------
    # Step 1: Identify the missed booking
    # ------------------------------------------------------------------

    @staticmethod
    async def _step_identify(
        db: AsyncSession,
        session_id: uuid.UUID,
        query: str,
        language: str,
        state: dict[str, Any],
    ) -> dict[str, Any]:
        """Find the passenger's missed booking by phone or booking ID."""
        # Check for cancel intent
        if query.lower().strip() in ("cancel", "stop", "quit", "no", "hindi", "tidak", "không"):
            return {
                "response_text": RESPONSES["confirm"]["cancelled"].get(language, RESPONSES["confirm"]["cancelled"]["en"]),
                "flow_metadata": {"flow": "rebooking", "step": "cancelled"},
                "is_complete": True,
            }

        # Extract booking ID or phone
        from app.services.chatbot.session import SessionManager
        entities = SessionManager.extract_entities(query, "request_requeue")

        phone = entities.get("phone")
        booking_id_str = entities.get("booking_id")

        booking: Booking | None = None
        passenger: Passenger | None = None

        try:
            if booking_id_str:
                bid = uuid.UUID(booking_id_str)
                result = await db.execute(select(Booking).where(Booking.id == bid))
                booking = result.scalars().first()

            if not booking and phone:
                p_result = await db.execute(
                    select(Passenger).where(Passenger.phone == phone)
                )
                passenger = p_result.scalars().first()
                if passenger:
                    b_result = await db.execute(
                        select(Booking)
                        .where(Booking.passenger_id == passenger.id)
                        .order_by(Booking.created_at.desc())
                        .limit(1)
                    )
                    booking = b_result.scalars().first()

            # Also check state for previously found booking
            if not booking and state.get("old_booking_id"):
                bid = uuid.UUID(state["old_booking_id"])
                result = await db.execute(select(Booking).where(Booking.id == bid))
                booking = result.scalars().first()

        except Exception as exc:
            logger.warning("Booking lookup in rebooking flow failed: %s", exc)

        if not booking:
            return {
                "response_text": RESPONSES["identify"]["not_found"].get(
                    language, RESPONSES["identify"]["not_found"]["en"]
                ),
                "flow_metadata": {"flow": "rebooking", "step": STEP_IDENTIFY},
                "is_complete": False,
            }

        # Check booking status
        if booking.status not in (BookingStatus.MISSED, BookingStatus.CANCELLED):
            status_text = booking.status.value
            template = RESPONSES["identify"]["not_missed"].get(
                language, RESPONSES["identify"]["not_missed"]["en"]
            )
            return {
                "response_text": template.format(status=status_text),
                "flow_metadata": {"flow": "rebooking", "step": "cancelled"},
                "is_complete": True,
            }

        # Get route info
        bus_result = await db.execute(select(Bus).where(Bus.id == booking.bus_id))
        bus = bus_result.scalars().first()
        route_origin = ""
        route_destination = ""

        if bus:
            route_result = await db.execute(
                select(BusRoute).where(BusRoute.id == bus.route_id)
            )
            route = route_result.scalars().first()
            if route:
                route_origin = route.origin
                route_destination = route.destination

        # Store booking info in state
        new_state = {
            "flow": "rebooking",
            "step": STEP_FIND_ALTERNATIVES,
            "old_booking_id": str(booking.id),
            "bus_id": str(booking.bus_id),
            "route_origin": route_origin,
            "route_destination": route_destination,
            "phone": phone or state.get("phone"),
        }

        template = RESPONSES["identify"]["found"].get(
            language, RESPONSES["identify"]["found"]["en"]
        )
        response_text = template.format(
            seat=booking.seat_number,
            plate=bus.plate_number if bus else "Unknown",
            date=booking.departure_date.strftime("%B %d"),
            status=booking.status.value,
            origin=route_origin,
            destination=route_destination,
        )

        return {
            "response_text": response_text,
            "flow_metadata": new_state,
            "is_complete": False,
        }

    # ------------------------------------------------------------------
    # Step 2: Find alternative buses
    # ------------------------------------------------------------------

    @staticmethod
    async def _step_find_alternatives(
        db: AsyncSession,
        query: str,
        language: str,
        state: dict[str, Any],
    ) -> dict[str, Any]:
        """Query available buses on the same route."""
        bus_id = state.get("bus_id")
        route_origin = state.get("route_origin", "")
        route_destination = state.get("route_destination", "")

        try:
            # Get the route from the original bus
            if bus_id:
                bus_result = await db.execute(
                    select(Bus).where(Bus.id == uuid.UUID(bus_id))
                )
                original_bus = bus_result.scalars().first()
                if original_bus:
                    route_id = original_bus.route_id
                    # Find other buses on same route
                    buses_result = await db.execute(
                        select(Bus).where(
                            Bus.route_id == route_id,
                            Bus.id != uuid.UUID(bus_id),
                        ).limit(5)
                    )
                    alternative_buses = buses_result.scalars().all()

                    # Filter to buses with available seats
                    available_buses: list[dict[str, Any]] = []
                    for bus in alternative_buses:
                        booked_result = await db.execute(
                            select(func.count()).select_from(Booking).where(
                                Booking.bus_id == bus.id,
                                Booking.status.in_([
                                    BookingStatus.CONFIRMED,
                                    BookingStatus.PENDING,
                                ]),
                            )
                        )
                        booked = booked_result.scalar() or 0
                        available = max(0, bus.capacity - booked)
                        if available > 0:
                            available_buses.append({
                                "id": str(bus.id),
                                "plate": bus.plate_number,
                                "available": available,
                                "capacity": bus.capacity,
                            })
                else:
                    available_buses = []
            else:
                available_buses = []

            if not available_buses:
                template = RESPONSES["find_alternatives"]["no_buses"].get(
                    language, RESPONSES["find_alternatives"]["no_buses"]["en"]
                )
                return {
                    "response_text": template.format(
                        origin=route_origin, destination=route_destination
                    ),
                    "flow_metadata": {
                        **state,
                        "step": STEP_FIND_ALTERNATIVES,
                        "checked_tomorrow": True,
                    },
                    "is_complete": False,
                }

            # Build bus list
            bus_lines = []
            for i, b in enumerate(available_buses, 1):
                bus_lines.append(f"{i}. Bus {b['plate']} · {b['available']} seats available")

            template = RESPONSES["find_alternatives"]["found_buses"].get(
                language, RESPONSES["find_alternatives"]["found_buses"]["en"]
            )
            new_state = {
                **state,
                "step": STEP_SELECT,
                "candidate_buses": available_buses,
            }

            return {
                "response_text": template.format(bus_list="\n".join(bus_lines)),
                "flow_metadata": new_state,
                "is_complete": False,
            }

        except Exception as exc:
            logger.warning("Find alternatives failed: %s", exc)
            return {
                "response_text": "Sorry, I had trouble finding alternative buses. Please try again.",
                "flow_metadata": {**state, "step": STEP_FIND_ALTERNATIVES},
                "is_complete": False,
            }

    # ------------------------------------------------------------------
    # Step 3: Select a bus
    # ------------------------------------------------------------------

    @staticmethod
    async def _step_select(
        db: AsyncSession,
        query: str,
        language: str,
        state: dict[str, Any],
    ) -> dict[str, Any]:
        """User selects a bus from the candidate list."""
        candidate_buses = state.get("candidate_buses", [])
        query_stripped = query.strip().lower()

        selected_bus: dict | None = None

        # Try to match by index or plate number
        for i, bus in enumerate(candidate_buses, 1):
            if query_stripped == str(i) or query_stripped == bus["plate"].lower():
                selected_bus = bus
                break

        # Try partial plate match
        if not selected_bus:
            for bus in candidate_buses:
                if bus["plate"].lower() in query_stripped:
                    selected_bus = bus
                    break

        if not selected_bus:
            # Re-list the options
            bus_lines = []
            for i, b in enumerate(candidate_buses, 1):
                bus_lines.append(f"{i}. Bus {b['plate']} · {b['available']} seats available")
            return {
                "response_text": f"Please choose one:\n" + "\n".join(bus_lines),
                "flow_metadata": state,
                "is_complete": False,
            }

        template = RESPONSES["select"]["confirm"].get(
            language, RESPONSES["select"]["confirm"]["en"]
        )
        new_state = {
            **state,
            "step": STEP_CONFIRM,
            "selected_bus_id": selected_bus["id"],
            "selected_bus_plate": selected_bus["plate"],
        }

        return {
            "response_text": template.format(plate=selected_bus["plate"]),
            "flow_metadata": new_state,
            "is_complete": False,
        }

    # ------------------------------------------------------------------
    # Step 4: Confirm and execute rebooking
    # ------------------------------------------------------------------

    @staticmethod
    async def _step_confirm(
        db: AsyncSession,
        query: str,
        language: str,
        state: dict[str, Any],
    ) -> dict[str, Any]:
        """Execute the rebooking or cancel."""
        query_lower = query.strip().lower()
        affirmative = {"yes", "oo", "opo", "ya", "có", "sige", "go", "proceed", "ok", "okay"}
        negative = {"no", "hindi", "tidak", "không", "cancel", "stop", "huwag", "jangan", "đừng"}

        if query_lower in negative:
            template = RESPONSES["confirm"]["cancelled"].get(
                language, RESPONSES["confirm"]["cancelled"]["en"]
            )
            return {
                "response_text": template,
                "flow_metadata": {"flow": "rebooking", "step": "cancelled"},
                "is_complete": True,
            }

        if query_lower not in affirmative:
            return {
                "response_text": "Please reply 'yes' to confirm the rebooking or 'no' to cancel.",
                "flow_metadata": state,
                "is_complete": False,
            }

        # Execute rebooking
        try:
            old_booking_id = uuid.UUID(state["old_booking_id"])
            new_bus_id = uuid.UUID(state["selected_bus_id"])

            # Cancel old booking
            old_result = await db.execute(
                select(Booking).where(Booking.id == old_booking_id)
            )
            old_booking = old_result.scalars().first()

            if not old_booking:
                return {
                    "response_text": "Sorry, I couldn't find your original booking. Please start over.",
                    "flow_metadata": {"flow": "rebooking", "step": "cancelled"},
                    "is_complete": True,
                }

            # Mark old booking as cancelled
            old_booking.status = BookingStatus.CANCELLED

            # Find an available seat on the new bus
            # (Simple: just pick the lowest-numbered unbooked seat)
            existing_seats_result = await db.execute(
                select(Booking.seat_number).where(
                    Booking.bus_id == new_bus_id,
                    Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
                )
            )
            taken_seats = set(existing_seats_result.scalars().all())

            # Generate possible seat numbers (1A, 1B, 2A, 2B, …)
            new_seat = None
            for row in range(1, 26):
                for col in ["A", "B", "C", "D"]:
                    seat_candidate = f"{row}{col}"
                    if seat_candidate not in taken_seats:
                        new_seat = seat_candidate
                        break
                if new_seat:
                    break

            if not new_seat:
                return {
                    "response_text": "Sorry, this bus is now fully booked. Let me find another option.",
                    "flow_metadata": {**state, "step": STEP_FIND_ALTERNATIVES},
                    "is_complete": False,
                }

            # Get bus info for the new bus
            bus_result = await db.execute(select(Bus).where(Bus.id == new_bus_id))
            new_bus = bus_result.scalars().first()

            # Create new booking
            now = datetime.now(timezone.utc)
            boarding_start = now + timedelta(minutes=15)
            boarding_end = now + timedelta(minutes=30)

            new_booking = Booking(
                passenger_id=old_booking.passenger_id,
                bus_id=new_bus_id,
                seat_number=new_seat,
                boarding_window_start=boarding_start,
                boarding_window_end=boarding_end,
                status=BookingStatus.CONFIRMED,
                departure_date=old_booking.departure_date,
            )
            db.add(new_booking)
            await db.commit()
            await db.refresh(new_booking)

            template = RESPONSES["confirm"]["success"].get(
                language, RESPONSES["confirm"]["success"]["en"]
            )
            response_text = template.format(
                plate=new_bus.plate_number if new_bus else state.get("selected_bus_plate", "Unknown"),
                seat=new_seat,
                window_start=boarding_start.strftime("%H:%M"),
                window_end=boarding_end.strftime("%H:%M"),
            )

            return {
                "response_text": response_text,
                "flow_metadata": {
                    "flow": "rebooking",
                    "step": "complete",
                    "new_booking_id": str(new_booking.id),
                },
                "is_complete": True,
            }

        except Exception as exc:
            logger.exception("Rebooking execution failed: %s", exc)
            return {
                "response_text": "Sorry, something went wrong with the rebooking. Please try again or contact support.",
                "flow_metadata": {"flow": "rebooking", "step": "cancelled"},
                "is_complete": True,
            }
