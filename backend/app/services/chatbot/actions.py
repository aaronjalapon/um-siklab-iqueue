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
from datetime import datetime, timedelta, timezone
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
            "id": "Pemesanan Anda ditemukan: kursi {seat} di Bus {plate} ({date}). Status: {status}. Saya akan mencari bus berikutnya untuk rute {origin} → {destination}.",
            "vi": "Đã tìm thấy đặt vé của bạn: ghế {seat} trên xe {plate} ({date}). Trạng thái: {status}. Tôi sẽ tìm chuyến tiếp theo cho tuyến {origin} → {destination}.",
        },
        "not_found": {
            "en": "I couldn't find a booking with that information. Please double-check and try again, or type 'cancel' to stop.",
            "fil": "Hindi ko mahanap ang booking. Pakitingnan muli at subukan ulit, o i-type ang 'cancel' para tumigil.",
            "id": "Saya tidak dapat menemukan pemesanan dengan informasi itu. Silakan periksa kembali dan coba lagi, atau ketik 'cancel' untuk berhenti.",
            "vi": "Tôi không tìm thấy đặt vé với thông tin đó. Vui lòng kiểm tra lại và thử lại, hoặc nhập 'cancel' để dừng.",
        },
        "not_missed": {
            "en": "Your booking is {status}, not missed or cancelled. You don't need to rebook. Is there something else I can help with?",
            "fil": "Ang iyong booking ay {status}, hindi missed o cancelled. Hindi mo kailangang mag-rebook. May iba pa ba akong maitutulong?",
            "id": "Pemesanan Anda berstatus {status}, bukan terlewat atau dibatalkan. Anda tidak perlu memesan ulang. Ada hal lain yang bisa saya bantu?",
            "vi": "Đặt vé của bạn đang ở trạng thái {status}, không phải bị lỡ hoặc đã hủy. Bạn không cần đặt lại. Tôi có thể giúp gì thêm?",
        },
    },
    "find_alternatives": {
        "no_buses": {
            "en": "Unfortunately, there are no more buses on the {origin} → {destination} route today. Would you like me to check tomorrow?",
            "fil": "Sa kasamaang palad, wala nang bus sa rutang {origin} → {destination} ngayong araw. Gusto mo bang tingnan ko bukas?",
            "id": "Sayangnya, tidak ada bus lain di rute {origin} → {destination} hari ini. Apakah Anda ingin saya cek besok?",
            "vi": "Rất tiếc, hôm nay không còn xe nào trên tuyến {origin} → {destination}. Bạn có muốn tôi kiểm tra ngày mai không?",
        },
        "found_buses": {
            "en": "Here are the next available buses:\n{bus_list}\n\nWhich one would you like? (Reply with the plate number or '1', '2', etc.)",
            "fil": "Ito ang mga susunod na available na bus:\n{bus_list}\n\nAlin ang gusto mo? (I-reply ang plate number o '1', '2', atbp.)",
            "id": "Berikut bus berikutnya yang tersedia:\n{bus_list}\n\nMana yang Anda pilih? (Balas dengan nomor plat atau '1', '2', dst.)",
            "vi": "Đây là các chuyến còn chỗ tiếp theo:\n{bus_list}\n\nBạn chọn chuyến nào? (Trả lời bằng biển số hoặc '1', '2', v.v.)",
        },
    },
    "select": {
        "confirm": {
            "en": "You selected Bus {plate}. I'll cancel your old booking and book you a seat. Shall I proceed? (Reply 'yes' or 'no')",
            "fil": "Pinili mo ang Bus {plate}. Kakanselahin ko ang lumang booking mo at magbu-book ng upuan para sa iyo. Itutuloy ba? (I-reply ang 'oo' o 'hindi')",
            "id": "Anda memilih Bus {plate}. Saya akan membatalkan pemesanan lama dan memesan kursi baru. Lanjutkan? (Balas 'yes' atau 'no')",
            "vi": "Bạn đã chọn xe {plate}. Tôi sẽ hủy đặt vé cũ và đặt ghế mới cho bạn. Tiếp tục chứ? (Trả lời 'yes' hoặc 'no')",
        },
    },
    "confirm": {
        "success": {
            "en": "Done! You're rebooked on Bus {plate}, seat {seat}. Boarding window: {window_start} → {window_end}. Your QR code has been generated. Have a safe trip!",
            "fil": "Tapos na! Naka-rebook ka na sa Bus {plate}, upuan {seat}. Oras ng pagsakay: {window_start} → {window_end}. Nagawa na ang QR code mo. Ligtas na byahe!",
            "id": "Selesai! Anda sudah dipesan ulang di Bus {plate}, kursi {seat}. Waktu naik: {window_start} → {window_end}. Kode QR Anda sudah dibuat. Selamat jalan!",
            "vi": "Xong rồi! Bạn đã được đặt lại trên xe {plate}, ghế {seat}. Giờ lên xe: {window_start} → {window_end}. Mã QR đã được tạo. Chúc bạn đi an toàn!",
        },
        "cancelled": {
            "en": "Rebooking cancelled. Your original booking is unchanged. How else can I help?",
            "fil": "Nakansela ang rebooking. Hindi nabago ang orihinal mong booking. Paano pa ako makakatulong?",
            "id": "Pemesanan ulang dibatalkan. Pemesanan lama Anda tidak berubah. Ada yang bisa saya bantu lagi?",
            "vi": "Đã hủy đặt lại. Đặt vé ban đầu của bạn không thay đổi. Tôi có thể giúp gì thêm?",
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

        if not phone and not booking_id_str and not state.get("old_booking_id"):
            return {
                "response_text": RESPONSES["identify"]["ask_phone"].get(
                    language, RESPONSES["identify"]["ask_phone"]["en"]
                ),
                "flow_metadata": {"flow": "rebooking", "step": STEP_IDENTIFY},
                "is_complete": False,
            }

        booking: Booking | None = None
        passenger: Passenger | None = None

        try:
            if booking_id_str:
                bid = uuid.UUID(booking_id_str)
                result = await db.execute(select(Booking).where(Booking.id == bid))
                booking = result.scalars().first()

            if not booking and phone:
                normalized_phone = phone.replace(" ", "").replace("-", "").strip()
                if normalized_phone.startswith("+63"):
                    normalized_phone = "0" + normalized_phone[3:]
                p_result = await db.execute(
                    select(Passenger).where(
                        func.replace(
                            func.replace(
                                func.replace(Passenger.phone, " ", ""),
                                "-",
                                "",
                            ),
                            "+63",
                            "0",
                        )
                        == normalized_phone
                    )
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
            "departure_date": booking.departure_date.isoformat(),
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
        departure_date_raw = state.get("departure_date")
        service_day = datetime.now(timezone.utc).date()
        if departure_date_raw:
            try:
                service_day = datetime.fromisoformat(departure_date_raw).date()
            except ValueError:
                pass
        start_dt = datetime.combine(service_day, datetime.min.time(), tzinfo=timezone.utc)
        end_dt = start_dt + timedelta(days=1)

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
                            Bus.tenant_id == original_bus.tenant_id,
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
                                Booking.departure_date >= start_dt,
                                Booking.departure_date < end_dt,
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
            prompt_map = {
                "en": "Please choose one:\n",
                "fil": "Pumili ng isa:\n",
                "id": "Silakan pilih salah satu:\n",
                "vi": "Vui lòng chọn một chuyến:\n",
            }
            return {
                "response_text": prompt_map.get(language, prompt_map["en"]) + "\n".join(bus_lines),
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
            prompt_map = {
                "en": "Please reply 'yes' to confirm the rebooking or 'no' to cancel.",
                "fil": "I-reply ang 'yes' para kumpirmahin ang rebooking o 'no' para kanselahin.",
                "id": "Balas 'yes' untuk mengonfirmasi pemesanan ulang atau 'no' untuk membatalkan.",
                "vi": "Vui lòng trả lời 'yes' để xác nhận đặt lại hoặc 'no' để hủy.",
            }
            return {
                "response_text": prompt_map.get(language, prompt_map["en"]),
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
                missing_map = {
                    "en": "Sorry, I couldn't find your original booking. Please start over.",
                    "fil": "Paumanhin, hindi ko mahanap ang orihinal mong booking. Pakisimulan ulit.",
                    "id": "Maaf, saya tidak dapat menemukan pemesanan lama Anda. Silakan mulai lagi.",
                    "vi": "Xin lỗi, tôi không tìm thấy đặt vé ban đầu. Vui lòng bắt đầu lại.",
                }
                return {
                    "response_text": missing_map.get(language, missing_map["en"]),
                    "flow_metadata": {"flow": "rebooking", "step": "cancelled"},
                    "is_complete": True,
                }

            passenger = await db.get(Passenger, old_booking.passenger_id)
            new_bus = await db.get(Bus, new_bus_id)
            if passenger is None or new_bus is None:
                raise ValueError("Passenger or selected bus missing during rebooking")

            if passenger.tenant_id != new_bus.tenant_id:
                raise ValueError("Passenger and selected bus belong to different tenants")

            try:
                from app.services.seat_assignment.date_aware import assign_for_travel_date
                from app.services.seat_assignment.scorer import PassengerContext

                pax_ctx = PassengerContext(
                    booking_id="rebooking",
                    passenger_name=passenger.name,
                    language_preference=passenger.language_pref,
                    travel_habit=passenger.travel_habits,
                    lifestyle_interest=passenger.lifestyle_interests,
                    needs_accessibility=passenger.accessibility_needs,
                    affinity_opt_in=False,
                )
                assignment = await assign_for_travel_date(
                    db,
                    new_bus_id,
                    pax_ctx,
                    old_booking.departure_date,
                    departure_datetime=old_booking.departure_date,
                )
                new_seat = assignment["seat_label"]
                bw = assignment.get("boarding_window", "")
                if "–" in bw:
                    start_text, end_text = bw.split("–", 1)
                    service_day = old_booking.departure_date.date()
                    start_hour, start_minute = [int(x) for x in start_text.split(":")]
                    end_hour, end_minute = [int(x) for x in end_text.split(":")]
                    boarding_start = datetime(
                        service_day.year, service_day.month, service_day.day,
                        start_hour, start_minute, tzinfo=timezone.utc,
                    )
                    boarding_end = datetime(
                        service_day.year, service_day.month, service_day.day,
                        end_hour, end_minute, tzinfo=timezone.utc,
                    )
                else:
                    boarding_start = old_booking.departure_date
                    boarding_end = old_booking.departure_date + timedelta(minutes=15)
            except Exception:
                existing_seats_result = await db.execute(
                    select(Booking.seat_number).where(
                        Booking.bus_id == new_bus_id,
                        Booking.departure_date >= datetime.combine(
                            old_booking.departure_date.date(),
                            datetime.min.time(),
                            tzinfo=timezone.utc,
                        ),
                        Booking.departure_date < datetime.combine(
                            old_booking.departure_date.date(),
                            datetime.min.time(),
                            tzinfo=timezone.utc,
                        ) + timedelta(days=1),
                        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
                    )
                )
                taken_seats = set(existing_seats_result.scalars().all())
                new_seat = None
                for row in range(1, 26):
                    for col in ["A", "B", "C", "D"]:
                        seat_candidate = f"{row}{col}"
                        if seat_candidate not in taken_seats:
                            new_seat = seat_candidate
                            break
                    if new_seat:
                        break
                boarding_start = old_booking.departure_date
                boarding_end = old_booking.departure_date + timedelta(minutes=15)

            if not new_seat:
                full_map = {
                    "en": "Sorry, this bus is now fully booked. Let me find another option.",
                    "fil": "Paumanhin, puno na ang bus na ito. Hahanap ako ng ibang option.",
                    "id": "Maaf, bus ini sudah penuh. Saya akan mencari pilihan lain.",
                    "vi": "Xin lỗi, xe này đã hết chỗ. Tôi sẽ tìm lựa chọn khác.",
                }
                return {
                    "response_text": full_map.get(language, full_map["en"]),
                    "flow_metadata": {**state, "step": STEP_FIND_ALTERNATIVES},
                    "is_complete": False,
                }

            # Mark old booking as cancelled only after a replacement seat is found.
            old_booking.status = BookingStatus.CANCELLED

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
            await db.flush()

            try:
                from app.services.qr_service.qr import QRService

                route = None
                if new_bus:
                    route_result = await db.execute(
                        select(BusRoute).where(BusRoute.id == new_bus.route_id)
                    )
                    route = route_result.scalars().first()
                new_booking.qr_token = QRService().generate_token(
                    new_booking,
                    route=route,
                    bus=new_bus,
                )
                await db.flush()
            except Exception:
                logger.warning("QR generation failed during chatbot rebooking")

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
                    "booking_id": str(new_booking.id),
                    "has_qr": bool(new_booking.qr_token),
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
