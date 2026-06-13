"""Multilingual chatbot service for IQueue passenger support.

Supports Filipino, Bahasa Indonesia, Vietnamese, and English.
Uses a fine-tuned XLM-RoBERTa model for intent classification with
keyword-based fallback when the model is unavailable.

Intent targets:
  - check_booking    — "Where is my booking?"
  - request_requeue  — "I missed my bus, can I rebook?"
  - get_departure_info — "When does my bus leave?"
  - surge_info       — "Is it going to be crowded?"
  - fallback         — Polite fallback in detected language
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from pathlib import Path
from typing import Any

from langdetect import detect as detect_language_raw
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingStatus
from app.models.bus import Bus
from app.models.bus_route import BusRoute
from app.models.passenger import Passenger
from app.schemas.chatbot import ChatbotResponse

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Intent keyword dictionaries per language (fallback when model unavailable)
# ---------------------------------------------------------------------------

INTENT_KEYWORDS: dict[str, dict[str, list[str]]] = {
    "en": {
        "check_booking": [
            "booking", "my booking", "where is my", "booking status",
            "my ticket", "check booking", "find booking", "reservation",
            "my reservation", "look up booking", "find my ticket",
        ],
        "request_requeue": [
            "missed", "late", "rebook", "missed my bus", "change booking",
            "another bus", "next bus", "reschedule", "left behind",
            "i missed", "missed the bus", "can i rebook",
        ],
        "get_departure_info": [
            "departure", "leave", "depart", "what time", "when does",
            "schedule", "departure time", "gate", "platform",
            "when is", "bus leaves", "leaving at",
        ],
        "surge_info": [
            "crowded", "busy", "full", "surge", "peak", "holiday",
            "many people", "crowd", "packed", "how full",
            "is it busy", "is it crowded", "how crowded",
        ],
    },
    "fil": {
        "check_booking": [
            "booking", "tiket", "nasaan", "booking ko", "reserbasyon",
            "tingnan", "status", "kumpirma", "hanapin", "booking status",
        ],
        "request_requeue": [
            "naiwan", "huli", "na-miss", "missed", "lumipat",
            "ibang bus", "susunod", "palit", "rebook", "na iwan",
            "di nakaabot", "hindi umabot",
        ],
        "get_departure_info": [
            "alis", "aalis", "kailan", "oras", "schedule",
            "iskedyul", "departure", "gate", "anong oras",
            "anong oras alis", "kailan aalis",
        ],
        "surge_info": [
            "marami", "puno", "siksikan", "maraming tao", "crowded",
            "holiday", "peak", "surge", "dami", "matao",
            "madami tao", "maraming pasahero", "karami", "gaano karami",
            "karamihan", "puno ba", "sikip",
        ],
    },
    "id": {
        "check_booking": [
            "booking", "tiket", "pesanan", "di mana", "status",
            "konfirmasi", "cek", "reservasi", "cari tiket",
        ],
        "request_requeue": [
            "ketinggalan", "telat", "terlambat", "ganti", "rebook",
            "bus lain", "berikutnya", "jadwal ulang", "ketinggalan bus",
        ],
        "get_departure_info": [
            "berangkat", "keberangkatan", "kapan", "jam", "jadwal",
            "pintu", "gate", "platform", "jam berapa",
        ],
        "surge_info": [
            "ramai", "penuh", "padat", "banyak orang", "crowded",
            "liburan", "puncak", "lonjakan", "sepi", "sibuk",
        ],
    },
    "vi": {
        "check_booking": [
            "đặt chỗ", "vé", "booking", "đâu", "trạng thái",
            "xác nhận", "kiểm tra", "đặt vé", "tìm vé",
        ],
        "request_requeue": [
            "lỡ", "muộn", "trễ", "đổi", "chuyến sau",
            "xe khác", "đặt lại", "dời lịch", "lỡ xe",
        ],
        "get_departure_info": [
            "khởi hành", "đi", "khi nào", "mấy giờ", "lịch trình",
            "giờ", "cổng", "bến", "mấy giờ đi",
        ],
        "surge_info": [
            "đông", "đầy", "chật", "nhiều người", "cao điểm",
            "lễ", "tết", "đông đúc", "vắng", "đông khách",
        ],
    },
}

# Negation words — reduce intent score when near a keyword match
NEGATION_WORDS: dict[str, set[str]] = {
    "en": {"no", "not", "never", "don't", "doesn't", "isn't", "can't", "won't"},
    "fil": {"hindi", "huwag", "wag", "walang", "wala", "di"},
    "id": {"tidak", "bukan", "jangan", "nggak", "gak", "tak"},
    "vi": {"không", "chưa", "chẳng", "đừng"},
}

# ---------------------------------------------------------------------------
# Fallback + intent responses per language
# ---------------------------------------------------------------------------

FALLBACK_RESPONSES: dict[str, str] = {
    "en": "I'm not sure I understand. You can ask me about your booking status, departure times, rebooking, or crowd levels. How can I help?",
    "fil": "Paumanhin, hindi ko maintindihan. Maaari mo akong tanungin tungkol sa iyong booking, oras ng alis, muling pag-book, o dami ng tao. Paano ako makakatulong?",
    "id": "Maaf, saya tidak mengerti. Anda bisa bertanya tentang status pemesanan, jadwal keberangkatan, pemesanan ulang, atau tingkat keramaian. Ada yang bisa saya bantu?",
    "vi": "Xin lỗi, tôi chưa hiểu. Bạn có thể hỏi về trạng thái đặt vé, giờ khởi hành, đặt lại vé, hoặc mức độ đông đúc. Tôi có thể giúp gì?",
}

INTENT_RESPONSES: dict[str, dict[str, str]] = {
    "check_booking": {
        "en": "To check your booking, please provide your booking ID or the phone number you used when booking.",
        "fil": "Para tingnan ang iyong booking, pakibigay ang iyong booking ID o ang numerong ginamit mo sa pag-book.",
        "id": "Untuk memeriksa pemesanan Anda, silakan berikan ID pemesanan atau nomor telepon yang digunakan saat memesan.",
        "vi": "Để kiểm tra đặt vé của bạn, vui lòng cung cấp mã đặt vé hoặc số điện thoại bạn đã dùng khi đặt vé.",
    },
    "request_requeue": {
        "en": "I can help you rebook! Your original booking will be cancelled and I'll find the next available bus on your route. Would you like to proceed?",
        "fil": "Matutulungan kitang mag-rebook! Ang iyong orihinal na booking ay kakanselahin at hahanap ako ng susunod na available na bus. Gusto mo bang magpatuloy?",
        "id": "Saya bisa membantu Anda memesan ulang! Pemesanan awal akan dibatalkan dan saya akan mencari bus berikutnya yang tersedia. Ingin melanjutkan?",
        "vi": "Tôi có thể giúp bạn đặt lại! Đặt vé cũ sẽ bị hủy và tôi sẽ tìm chuyến xe tiếp theo có sẵn. Bạn có muốn tiếp tục không?",
    },
    "get_departure_info": {
        "en": "I can look up departure information for you. Which route and date are you interested in?",
        "fil": "Maaari kong tingnan ang impormasyon ng alis para sa iyo. Anong ruta at petsa ang gusto mo?",
        "id": "Saya bisa mencari informasi keberangkatan untuk Anda. Rute dan tanggal mana yang Anda minati?",
        "vi": "Tôi có thể tra cứu thông tin khởi hành cho bạn. Bạn quan tâm đến tuyến đường và ngày nào?",
    },
    "surge_info": {
        "en": "I can check crowd levels for your route. During holidays and weekends, surge levels can be high. Which route are you asking about?",
        "fil": "Maaari kong tingnan ang antas ng dami ng tao. Sa mga holiday at weekend, maaaring mataas ang surge. Anong ruta ang tinatanong mo?",
        "id": "Saya bisa memeriksa tingkat keramaian untuk rute Anda. Saat liburan dan akhir pekan, tingkat lonjakan bisa tinggi. Rute mana yang Anda tanyakan?",
        "vi": "Tôi có thể kiểm tra mức độ đông đúc cho tuyến đường của bạn. Vào dịp lễ và cuối tuần, mức độ có thể cao. Bạn đang hỏi về tuyến nào?",
    },
}

# ---------------------------------------------------------------------------
# Per-language confidence calibration
#   Derived from evaluation — adjust threshold per language based on
#   historical accuracy. Higher threshold = more conservative for that lang.
# ---------------------------------------------------------------------------

LANGUAGE_CONFIDENCE_OFFSET: dict[str, float] = {
    "en": 0.00,   # baseline
    "fil": 0.05,  # slightly conservative (may have less training data)
    "id": 0.02,
    "vi": 0.03,
}

# The base minimum confidence — individual languages add their offset
BASE_MIN_CONFIDENCE = 0.50

# ---------------------------------------------------------------------------
# Intents that are "simple" (use templates) vs "complex" (use LLM)
# ---------------------------------------------------------------------------

SIMPLE_INTENTS = {"surge_info", "get_departure_info"}
COMPLEX_INTENTS = {"check_booking", "request_requeue", "fallback"}


# ============================================================================
# Module-level singleton
# ============================================================================

_chatbot_service: "ChatbotService | None" = None
_singleton_load_attempted: bool = False


def get_chatbot_service() -> "ChatbotService | None":
    """Return the module-level chatbot service singleton.

    Loads the XLM-RoBERTa model on first call.  Returns None if the model
    could not be loaded — callers should use the keyword-based fallback path.
    """
    global _chatbot_service, _singleton_load_attempted

    if not _singleton_load_attempted:
        _singleton_load_attempted = True
        try:
            _chatbot_service = ChatbotService()
            if _chatbot_service._model_available:
                logger.info("ChatbotService singleton initialised with XLM-RoBERTa model")
            else:
                logger.info("ChatbotService singleton initialised (keyword fallback only)")
        except Exception as exc:
            logger.error("Failed to create ChatbotService: %s", exc)
            _chatbot_service = None

    return _chatbot_service


# ============================================================================
# ChatbotService
# ============================================================================


class ChatbotService:
    """Multilingual chatbot with XLM-RoBERTa intent classification.

    Uses a fine-tuned XLM-RoBERTa pipeline for intent detection across
    4 ASEAN languages.  Falls back to keyword matching when the model
    is not available (e.g. before training completes).
    """

    SUPPORTED_LANGUAGES = {"en", "fil", "id", "vi"}

    def __init__(self) -> None:
        self._model_available = False
        self._classifier = None
        self._id_to_label: dict[int, str] = {}

        from app.core.config import get_settings

        settings = get_settings()
        model_path = Path(settings.CHATBOT_MODEL_PATH)

        if model_path.exists() and (model_path / "config.json").exists():
            try:
                from transformers import pipeline

                self._classifier = pipeline(
                    "text-classification",
                    model=str(model_path),
                    tokenizer=str(model_path),
                    top_k=None,  # return all scores
                    device=-1,   # CPU
                )

                label_map_path = model_path / "label_map.json"
                if label_map_path.exists():
                    with open(label_map_path) as f:
                        label_map_str = json.load(f)
                    self._id_to_label = {
                        int(k): v for k, v in label_map_str.items()
                    }
                else:
                    self._id_to_label = {
                        0: "check_booking",
                        1: "request_requeue",
                        2: "get_departure_info",
                        3: "surge_info",
                        4: "fallback",
                    }

                self._model_available = True
                logger.info("Loaded XLM-RoBERTa intent classifier from %s", model_path)

            except Exception as exc:
                logger.warning("Failed to load model pipeline: %s — using keyword fallback", exc)
                self._model_available = False
        else:
            logger.info(
                "Model not found at %s — using keyword fallback. "
                "Run ml/chatbot/train.py to train the classifier.",
                model_path,
            )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def classify(self, text: str, language: str) -> dict:
        """Classify the intent of a user query.

        Uses the XLM-RoBERTa pipeline when available, otherwise falls back
        to keyword matching.

        Returns:
            dict with keys: intent, confidence, detected_language, all_scores
        """
        if self._model_available:
            try:
                results = self._classifier(text)[0]
                best = max(results, key=lambda x: x["score"])

                label_str = best["label"]
                if label_str.startswith("LABEL_"):
                    label_idx = int(label_str.split("_")[1])
                else:
                    label_idx = int(label_str)

                intent = self._id_to_label.get(label_idx, "fallback")
                confidence = round(best["score"], 4)

                # Per-language confidence threshold
                offset = LANGUAGE_CONFIDENCE_OFFSET.get(language, 0.0)
                min_conf = BASE_MIN_CONFIDENCE + offset
                if confidence < min_conf:
                    intent = "fallback"

                all_scores = {}
                for r in results:
                    rl = r["label"]
                    if rl.startswith("LABEL_"):
                        ri = int(rl.split("_")[1])
                    else:
                        ri = int(rl)
                    r_intent = self._id_to_label.get(ri, "fallback")
                    all_scores[r_intent] = round(r["score"], 4)

                return {
                    "intent": intent,
                    "confidence": confidence,
                    "detected_language": language,
                    "all_scores": all_scores,
                }
            except Exception as exc:
                logger.warning("Model inference error: %s — falling back to keyword", exc)

        # Keyword fallback
        intent, confidence = self._classify_intent_fallback(text, language)
        return {
            "intent": intent,
            "confidence": confidence,
            "detected_language": language,
            "all_scores": {},
        }

    def classify_with_context(
        self, text: str, language: str, session_context: dict[str, Any] | None = None
    ) -> dict:
        """Classify intent with session context biasing.

        If the session has accumulated entities (route, date, booking_id),
        use them to bias the intent classification — e.g. if the user
        previously asked about a route, prefer surge_info or departure_info.

        Args:
            text: The user's query.
            language: Detected language code.
            session_context: Aggregated session entities (from SessionManager).

        Returns:
            Same dict format as classify().
        """
        # Get base classification
        result = self.classify(text, language)

        if not session_context or not session_context.get("route_cities"):
            return result

        # Context biasing: if the user has mentioned a route before and
        # is now asking a short/ambiguous follow-up, nudge the intent
        ctx = session_context
        intent = result["intent"]

        # Short ambiguous queries in context of a route → likely surge or departure
        word_count = len(text.split())
        has_route = bool(ctx.get("origin") or ctx.get("route_cities"))
        has_date = bool(ctx.get("date"))

        if word_count <= 5 and has_route and intent == "fallback":
            all_scores = result.get("all_scores", {})

            # Check if surge_info or departure_info is close behind
            surge_score = all_scores.get("surge_info", 0)
            depart_score = all_scores.get("get_departure_info", 0)

            if surge_score > 0.25:
                intent = "surge_info"
                result["confidence"] = min(0.7, surge_score + 0.15)
            elif depart_score > 0.25:
                intent = "get_departure_info"
                result["confidence"] = min(0.7, depart_score + 0.15)

        # If user has route + date context and asks something short,
        # check_booking might be what they want
        if word_count <= 4 and has_route and has_date:
            all_scores = result.get("all_scores", {})
            booking_score = all_scores.get("check_booking", 0)
            if booking_score > 0.3:
                intent = "check_booking"
                result["confidence"] = min(0.7, booking_score + 0.1)

        result["intent"] = intent
        return result

    async def respond(
        self,
        query: str,
        language: str | None = None,
        booking_id: uuid.UUID | None = None,
        db: AsyncSession | None = None,
        session_id: uuid.UUID | None = None,
        phone: str | None = None,
    ) -> tuple[ChatbotResponse, dict[str, Any], int]:
        """Process a user query and return a chatbot response.

        Args:
            query: The user's question text.
            language: ISO 639-1 language code (auto-detected if None).
            booking_id: Optional booking context for personalised responses.
            db: Optional database session for booking/route lookups.
            session_id: Optional session ID for multi-turn conversation.
            phone: Optional phone number for booking lookup.

        Returns:
            Tuple of (ChatbotResponse, session_metadata, degradation_level).
            degradation_level: 0=full, 1=no LLM, 2=no model, 3=no DB, 4=total.
        """
        degradation = 0
        session_metadata: dict[str, Any] = {}

        # --- Degradation-aware DB check ---
        if db is None:
            degradation = max(degradation, 3)

        # Step 1: Detect language with confidence
        if language and language in self.SUPPORTED_LANGUAGES:
            detected_lang = language
            lang_confidence = 0.95  # User explicitly selected
        else:
            detected_lang, lang_confidence = self._detect_language(query)

        # Step 2: Load session context if available
        session_context: dict[str, Any] | None = None
        if session_id and db:
            try:
                from app.services.chatbot.session import SessionManager

                session_ctx = await SessionManager.get_context(db, session_id)
                if session_ctx:
                    session_context = session_ctx
            except Exception:
                logger.warning("Failed to load session context for %s", session_id)

        # Merge phone from various sources
        effective_phone = phone
        if not effective_phone and session_context:
            effective_phone = session_context.get("phone")
        # Also try extracting phone from query
        if not effective_phone:
            from app.services.chatbot.session import SessionManager
            entities = SessionManager.extract_entities(query, "")
            effective_phone = entities.get("phone")

        # Step 3: Classify intent
        if self._model_available:
            classification = await asyncio.to_thread(
                self.classify_with_context, query, detected_lang, session_context
            )
        else:
            degradation = max(degradation, 2)
            classification = self.classify_with_context(query, detected_lang, session_context)

        intent = classification["intent"]
        confidence = classification["confidence"]

        # Step 4: Extract entities from this query
        from app.services.chatbot.session import SessionManager
        entities = SessionManager.extract_entities(query, intent)

        # Step 5: Build response based on intent (with real data when available)
        response_text = ""
        suggested_actions: list[str] = []

        if intent == "check_booking" and db:
            degradation, response_text = await self._handle_check_booking(
                db, booking_id, effective_phone, detected_lang, degradation,
            )
            if degradation >= 4:
                # Lookup failed completely — fall through to template
                response_text = ""

        if not response_text and intent == "surge_info" and db:
            degradation, response_text = await self._handle_surge_info(
                db, query, session_context, entities, detected_lang, degradation,
            )

        if not response_text and intent == "get_departure_info" and db:
            degradation, response_text = await self._handle_departure_info(
                db, query, session_context, entities, detected_lang, degradation,
            )

        if not response_text and intent == "request_requeue" and db:
            degradation, response_text = await self._handle_requeue_start(
                db, effective_phone, booking_id, session_context,
                entities, detected_lang, degradation,
            )

        # Step 6: Fall back to templates if no real-data response yet
        if not response_text:
            if intent == "fallback":
                response_text = FALLBACK_RESPONSES.get(
                    detected_lang, FALLBACK_RESPONSES["en"]
                )
            else:
                response_text = INTENT_RESPONSES.get(intent, {}).get(
                    detected_lang,
                    INTENT_RESPONSES.get(intent, {}).get("en", ""),
                )

        suggested_actions = self._get_suggestions(intent, detected_lang)

        # Step 7: Try LLM enhancement for complex intents (if we have real data)
        if intent in COMPLEX_INTENTS and response_text and degradation < 2:
            try:
                from app.services.chatbot.llm import LLMResponder

                llm_text = await LLMResponder.generate_response(
                    intent=intent,
                    response_data={"template_response": response_text},
                    language=detected_lang,
                    session_context=session_context,
                    query=query,
                )
                if llm_text:
                    response_text = llm_text
            except Exception as exc:
                logger.warning("LLM enhancement failed: %s", exc)
                degradation = max(degradation, 1)

        # Step 8: Build session metadata for this turn
        session_metadata = {
            "intent": intent,
            "entities": entities,
            "language": detected_lang,
        }

        # Merge with any flow metadata from rebooking
        if intent == "request_requeue":
            session_metadata["flow"] = "rebooking"
            session_metadata["flow_step"] = 1

        return (
            ChatbotResponse(
                response_text=response_text,
                detected_language=detected_lang,
                language_confidence=round(lang_confidence, 4),
                intent=intent,
                suggested_actions=suggested_actions,
                confidence=confidence,
                session_id=session_id,
                degradation_level=degradation,
            ),
            session_metadata,
            degradation,
        )

    # ------------------------------------------------------------------
    # Intent handlers — real data queries
    # ------------------------------------------------------------------

    async def _handle_check_booking(
        self,
        db: AsyncSession,
        booking_id: uuid.UUID | None,
        phone: str | None,
        language: str,
        degradation: int,
    ) -> tuple[int, str]:
        """Look up a booking by ID or phone and return a status message."""
        booking: Booking | None = None

        try:
            if booking_id:
                result = await db.execute(
                    select(Booking).where(Booking.id == booking_id)
                )
                booking = result.scalars().first()
            elif phone:
                # Find passenger by phone, then latest booking
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
        except Exception as exc:
            logger.warning("Booking lookup failed: %s", exc)
            return max(degradation, 3), ""

        if not booking:
            templates = {
                "en": "I couldn't find a booking with that information. Please double-check your booking ID or phone number and try again.",
                "fil": "Hindi ko mahanap ang booking. Pakitingnan muli ang iyong booking ID o numero ng telepono at subukan ulit.",
                "id": "Saya tidak dapat menemukan pemesanan dengan informasi tersebut. Silakan periksa kembali ID pemesanan atau nomor telepon Anda.",
                "vi": "Tôi không tìm thấy đặt vé với thông tin đó. Vui lòng kiểm tra lại mã đặt vé hoặc số điện thoại.",
            }
            return degradation, templates.get(language, templates["en"])

        # Build booking status response
        status_map = {
            BookingStatus.CONFIRMED: {
                "en": "confirmed", "fil": "kumpirmado",
                "id": "dikonfirmasi", "vi": "đã xác nhận",
            },
            BookingStatus.PENDING: {
                "en": "pending", "fil": "nakabinbin",
                "id": "tertunda", "vi": "đang chờ",
            },
            BookingStatus.BOARDED: {
                "en": "boarded", "fil": "nakasakay na",
                "id": "sudah naik", "vi": "đã lên xe",
            },
            BookingStatus.CANCELLED: {
                "en": "cancelled", "fil": "kanselado",
                "id": "dibatalkan", "vi": "đã hủy",
            },
            BookingStatus.MISSED: {
                "en": "missed", "fil": "hindi nakasakay",
                "id": "ketinggalan", "vi": "đã lỡ",
            },
        }

        status_text = status_map.get(booking.status, {}).get(language, booking.status.value)

        # Try to get route info
        route_info = ""
        try:
            bus_result = await db.execute(
                select(Bus).where(Bus.id == booking.bus_id)
            )
            bus = bus_result.scalars().first()
            if bus:
                route_result = await db.execute(
                    select(BusRoute).where(BusRoute.id == bus.route_id)
                )
                route = route_result.scalars().first()
                if route:
                    route_info = f" {route.origin} → {route.destination}"
        except Exception:
            pass

        templates = {
            "en": f"Your booking is {status_text}.{route_info} Seat: {booking.seat_number}. "
                  f"Departure: {booking.departure_date.strftime('%B %d, %Y')}. "
                  f"Boarding window: {booking.boarding_window_start.strftime('%H:%M')} → "
                  f"{booking.boarding_window_end.strftime('%H:%M')}.",
            "fil": f"Ang iyong booking ay {status_text}.{route_info} Upuan: {booking.seat_number}. "
                   f"Alis: {booking.departure_date.strftime('%B %d, %Y')}. "
                   f"Oras ng pagsakay: {booking.boarding_window_start.strftime('%H:%M')} → "
                   f"{booking.boarding_window_end.strftime('%H:%M')}.",
            "id": f"Pemesanan Anda {status_text}.{route_info} Kursi: {booking.seat_number}. "
                  f"Keberangkatan: {booking.departure_date.strftime('%B %d, %Y')}. "
                  f"Waktu naik: {booking.boarding_window_start.strftime('%H:%M')} → "
                  f"{booking.boarding_window_end.strftime('%H:%M')}.",
            "vi": f"Đặt vé của bạn {status_text}.{route_info} Ghế: {booking.seat_number}. "
                  f"Khởi hành: {booking.departure_date.strftime('%B %d, %Y')}. "
                  f"Giờ lên xe: {booking.boarding_window_start.strftime('%H:%M')} → "
                  f"{booking.boarding_window_end.strftime('%H:%M')}.",
        }

        return degradation, templates.get(language, templates["en"])

    async def _handle_surge_info(
        self,
        db: AsyncSession,
        query: str,
        session_context: dict[str, Any] | None,
        entities: dict[str, Any],
        language: str,
        degradation: int,
    ) -> tuple[int, str]:
        """Query real surge forecast for a route."""
        try:
            from app.services.forecasting.predictor import (
                ForecastingService,
                _route_slug_from_id,
            )

            # Determine route from context or entities
            origin = None
            destination = None

            if session_context:
                origin = session_context.get("origin")
                destination = session_context.get("destination")
            if not origin and entities.get("origin"):
                origin = entities["origin"]
                destination = entities.get("destination")

            if not origin:
                # Try to match route from query
                route_cities = entities.get("route_cities", [])
                if len(route_cities) >= 2:
                    origin, destination = route_cities[0], route_cities[-1]

            if not origin:
                return degradation, ""  # Can't determine route — fall through

            # Find matching route
            route_result = await db.execute(
                select(BusRoute).where(
                    func.lower(BusRoute.origin).contains(origin.lower()),
                    func.lower(BusRoute.destination).contains(destination.lower() if destination else origin.lower()),
                ).limit(1)
            )
            route = route_result.scalars().first()

            if not route:
                return degradation, ""

            # Get forecast
            forecast_service = ForecastingService()
            predictions = forecast_service.predict(route.id, horizon_days=7)

            # Format response
            surge_days = [p for p in predictions if p.surge_probability > 0.25]
            if not surge_days:
                response_map = {
                    "en": f"The {route.origin} → {route.destination} route looks normal this week. No significant surge expected. Safe to travel!",
                    "fil": f"Mukhang normal ang ruta {route.origin} → {route.destination} ngayong linggo. Walang inaasahang matinding surge. Ligtas bumyahe!",
                    "id": f"Rute {route.origin} → {route.destination} terlihat normal minggu ini. Tidak ada lonjakan signifikan. Aman untuk bepergian!",
                    "vi": f"Tuyến {route.origin} → {route.destination} có vẻ bình thường tuần này. Không có đợt tăng đột biến nào. An toàn để đi lại!",
                }
                return degradation, response_map.get(language, response_map["en"])

            # Highlight top surge days
            top = sorted(surge_days, key=lambda x: x.surge_probability, reverse=True)[:3]
            day_strs = []
            for p in top:
                day_name = p.forecast_date.strftime("%A")
                pct = int(p.surge_probability * 100)
                holiday_note = f" ({p.holiday_name})" if p.holiday_name else ""
                day_strs.append(f"{day_name}: {pct}%{holiday_note}")

            response_map = {
                "en": f"Surge forecast for {route.origin} → {route.destination} this week:\n"
                      + "\n".join(f"• {d}" for d in day_strs)
                      + f"\n\nI recommend booking early for the high-surge days.",
                "fil": f"Surge forecast para sa {route.origin} → {route.destination} ngayong linggo:\n"
                       + "\n".join(f"• {d}" for d in day_strs)
                       + f"\n\nInirerekomenda kong mag-book nang maaga para sa mga araw na mataas ang surge.",
            }
            return degradation, response_map.get(language, response_map["en"])

        except Exception as exc:
            logger.warning("Surge info lookup failed: %s", exc)
            return max(degradation, 3), ""

    async def _handle_departure_info(
        self,
        db: AsyncSession,
        query: str,
        session_context: dict[str, Any] | None,
        entities: dict[str, Any],
        language: str,
        degradation: int,
    ) -> tuple[int, str]:
        """Query real bus departure schedule for a route."""
        try:
            origin = None
            destination = None

            if session_context:
                origin = session_context.get("origin")
                destination = session_context.get("destination")
            if not origin and entities.get("origin"):
                origin = entities["origin"]
                destination = entities.get("destination")
            if not origin:
                route_cities = entities.get("route_cities", [])
                if len(route_cities) >= 2:
                    origin, destination = route_cities[0], route_cities[-1]

            if not origin:
                return degradation, ""

            # Find matching routes and their buses
            route_result = await db.execute(
                select(BusRoute).where(
                    func.lower(BusRoute.origin).contains(origin.lower()),
                    func.lower(BusRoute.destination).contains(
                        destination.lower() if destination else origin.lower()
                    ),
                ).limit(3)
            )
            routes = route_result.scalars().all()

            if not routes:
                return degradation, ""

            # Get buses for these routes
            all_buses: list[Bus] = []
            for route in routes:
                bus_result = await db.execute(
                    select(Bus).where(Bus.route_id == route.id).limit(5)
                )
                all_buses.extend(bus_result.scalars().all())

            if not all_buses:
                response_map = {
                    "en": f"I found the {routes[0].origin} → {routes[0].destination} route but no buses are currently scheduled. Please check back later.",
                    "fil": f"Nakita ko ang ruta {routes[0].origin} → {routes[0].destination} pero walang naka-schedule na bus. Pakitingnan muli.",
                }
                return degradation, response_map.get(language, response_map["en"])

            # Format bus list
            bus_lines = []
            for bus in all_buses[:5]:
                # Count booked seats to show availability
                booked_count_result = await db.execute(
                    select(func.count()).select_from(Booking).where(
                        Booking.bus_id == bus.id,
                        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
                    )
                )
                booked = booked_count_result.scalar() or 0
                available = max(0, bus.capacity - booked)
                bus_lines.append(f"Bus {bus.plate_number} · {available} seats available")

            response_map = {
                "en": f"Buses on {routes[0].origin} → {routes[0].destination}:\n"
                      + "\n".join(f"• {b}" for b in bus_lines)
                      + f"\n\nWould you like to book a specific bus?",
                "fil": f"Mga bus sa {routes[0].origin} → {routes[0].destination}:\n"
                       + "\n".join(f"• {b}" for b in bus_lines)
                       + f"\n\nGusto mo bang mag-book ng partikular na bus?",
            }
            return degradation, response_map.get(language, response_map["en"])

        except Exception as exc:
            logger.warning("Departure info lookup failed: %s", exc)
            return max(degradation, 3), ""

    async def _handle_requeue_start(
        self,
        db: AsyncSession,
        phone: str | None,
        booking_id: uuid.UUID | None,
        session_context: dict[str, Any] | None,
        entities: dict[str, Any],
        language: str,
        degradation: int,
    ) -> tuple[int, str]:
        """Start the rebooking flow — identify the missed booking."""
        try:
            booking: Booking | None = None

            if booking_id:
                result = await db.execute(
                    select(Booking).where(Booking.id == booking_id)
                )
                booking = result.scalars().first()
            elif phone:
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
            elif session_context:
                ctx_phone = session_context.get("phone")
                if ctx_phone:
                    p_result = await db.execute(
                        select(Passenger).where(Passenger.phone == ctx_phone)
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

            if not booking:
                # Need to identify — ask for phone or booking ID
                response_map = {
                    "en": "I can help you rebook! First, I need to find your booking. Can you provide your booking ID or the phone number you used when booking?",
                    "fil": "Matutulungan kitang mag-rebook! Kailangan ko munang mahanap ang booking mo. Pwede mo bang ibigay ang iyong booking ID o numero ng telepono?",
                    "id": "Saya bisa membantu Anda memesan ulang! Pertama, saya perlu menemukan pemesanan Anda. Bisakah Anda memberikan ID pemesanan atau nomor telepon yang digunakan?",
                    "vi": "Tôi có thể giúp bạn đặt lại! Trước tiên, tôi cần tìm đặt vé của bạn. Bạn có thể cung cấp mã đặt vé hoặc số điện thoại đã dùng không?",
                }
                return degradation, response_map.get(language, response_map["en"])

            # Found the booking — confirm and find alternatives
            bus_result = await db.execute(
                select(Bus).where(Bus.id == booking.bus_id)
            )
            bus = bus_result.scalars().first()

            response_map = {
                "en": f"Found your booking: seat {booking.seat_number} on Bus {bus.plate_number if bus else 'Unknown'} "
                      f"({booking.departure_date.strftime('%B %d')}). "
                      f"Status: {booking.status.value}. "
                      f"I'll find the next available bus on this route. One moment...",
                "fil": f"Nakita ko ang booking mo: upuan {booking.seat_number} sa Bus {bus.plate_number if bus else 'Unknown'} "
                       f"({booking.departure_date.strftime('%B %d')}). "
                       f"Status: {booking.status.value}. "
                       f"Hahanap ako ng susunod na available na bus sa rutang ito. Sandali lang...",
            }
            return degradation, response_map.get(language, response_map["en"])

        except Exception as exc:
            logger.warning("Requeue start failed: %s", exc)
            return max(degradation, 3), ""

    # ------------------------------------------------------------------
    # Internal — language detection
    # ------------------------------------------------------------------

    @staticmethod
    def _detect_language(query: str) -> tuple[str, float]:
        """Detect the language of a query and return (language, confidence).

        Uses char-set heuristics first, then falls back to langdetect.
        Returns confidence alongside the language code.

        Falls back to ("en", 0.40) only when all detection methods fail.
        """
        q = query.lower().strip()

        # --- Heuristic layer: character-set + stopword matching ---
        # Vietnamese: unique diacritics + common words
        vi_chars = set("ơưăêôđộểẩẫạảờừữốổỗệếềụị")
        vi_words = {
            "không", "có", "tôi", "bạn", "là", "này", "kia", "ấy",
            "đi", "đâu", "bao", "nhiêu", "mấy", "giờ", "chuyến", "xe",
            "vé", "đặt", "hủy", "giúp", "vui", "lòng", "cảm", "ơn",
        }
        vi_char_match = any(ch in q for ch in vi_chars)
        vi_word_count = sum(1 for w in vi_words if w in q.split())
        if vi_char_match:
            confidence = 0.95 if vi_word_count >= 2 else 0.85
            return "vi", confidence
        if vi_word_count >= 2:
            return "vi", 0.80

        # Filipino/Tagalog: common function words + particles
        fil_words = {
            "ang", "ng", "mga", "sa", "ko", "mo", "namin", "natin",
            "kayo", "sila", "ito", "iyan", "po", "ho", "opo", "oo",
            "hindi", "wala", "meron", "may", "ba", "na", "pa", "lang",
            "dito", "diyan", "doon", "kung", "para", "dahil",
        }
        fil_match_count = sum(1 for w in fil_words if w in q.split())
        if fil_match_count >= 3:
            return "fil", min(0.95, 0.75 + fil_match_count * 0.05)
        if fil_match_count >= 2:
            return "fil", 0.70

        # Indonesian/Bahasa: common function words
        id_words = {
            "yang", "dan", "di", "ke", "dari", "ini", "itu", "saya",
            "anda", "kami", "kita", "mereka", "tidak", "bisa", "boleh",
            "dengan", "untuk", "pada", "ada", "apa", "bagaimana", "kapan",
            "bus", "bis", "tiket", "pesan", "jadwal", "rute",
        }
        id_match_count = sum(1 for w in id_words if w in q.split())
        if id_match_count >= 3:
            return "id", min(0.95, 0.75 + id_match_count * 0.05)
        if id_match_count >= 2:
            return "id", 0.70

        # --- Code-switch detection ---
        # If query has English words mixed with some Filipino/Indonesian words,
        # classify by the non-English signal
        english_stopwords = {"the", "is", "a", "an", "in", "on", "at", "to", "for",
                             "of", "and", "or", "but", "with", "from", "by", "my",
                             "i", "you", "he", "she", "it", "we", "they", "me",
                             "can", "will", "would", "could", "should", "what",
                             "where", "when", "who", "how", "why", "which"}

        words_in_query = set(q.split())
        non_en_signals = fil_match_count + id_match_count
        en_signals = len(words_in_query & english_stopwords)

        # Code-switched: has both English and local language signals
        if non_en_signals >= 2 and en_signals >= 1:
            # Filipinos often code-switch — default to Filipino if we see any fil words
            if fil_match_count >= id_match_count and fil_match_count > 0:
                return "fil", 0.65
            elif id_match_count > 0:
                return "id", 0.65

        # Short query with few signals → low confidence English
        word_count = len(words_in_query)
        if word_count <= 3 and non_en_signals == 0:
            return "en", 0.50

        # --- Fallback layer: langdetect ---
        try:
            lang = detect_language_raw(query)
            lang_map = {
                "tl": "fil",  # Tagalog → Filipino
                "id": "id",
                "vi": "vi",
                "en": "en",
                "ms": "id",  # Malay → Indonesian (closest match)
            }
            detected = lang_map.get(lang, "en")

            # Confidence based on langdetect + word count
            if detected == "en":
                confidence = 0.60 if word_count <= 5 else 0.70
            else:
                confidence = 0.65  # langdetect identified non-English
            return detected, confidence
        except Exception:
            return "en", 0.40

    # ------------------------------------------------------------------
    # Internal — keyword fallback classifier
    # ------------------------------------------------------------------

    @staticmethod
    def _classify_intent_fallback(query: str, language: str) -> tuple[str, float]:
        """Classify intent via keyword matching (fallback when model unavailable).

        Handles negation, supports phrase-level matching (bigrams), and
        weights rare keywords higher.

        Returns (intent, confidence) tuple.
        """
        query_lower = query.lower().strip()
        query_words = query_lower.split()
        keywords = INTENT_KEYWORDS.get(language, INTENT_KEYWORDS["en"])

        # Detect negation spans — words near negation markers should not count
        negations = NEGATION_WORDS.get(language, NEGATION_WORDS["en"])
        negated_positions: set[int] = set()
        for i, word in enumerate(query_words):
            clean_word = word.strip("',.!?")
            if clean_word in negations:
                # Mark this position and the next 2 as negated
                for j in range(i, min(len(query_words), i + 3)):
                    negated_positions.add(j)

        best_intent = "fallback"
        best_score = 0.0

        # Count total word occurrences across all keywords for IDF-like weighting
        word_freq: dict[str, int] = {}
        for intent_words in keywords.values():
            for w in intent_words:
                word_freq[w] = word_freq.get(w, 0) + 1

        for intent, words in keywords.items():
            score = 0.0
            total_weight = len(words)

            for i, word in enumerate(query_words):
                clean_word = word.strip("',.!?")
                if clean_word in negations:
                    continue  # Skip negation words themselves

                # Single-word matches
                if clean_word in words:
                    # IDF-like weighting: rare keywords count more
                    freq = word_freq.get(clean_word, 1)
                    weight = 1.0 / freq
                    if i in negated_positions:
                        weight *= -0.5  # Negated context reduces score
                    score += weight

                # Bigram matches (current word + next)
                if i < len(query_words) - 1:
                    next_word = query_words[i + 1].strip("',.!?")
                    bigram = f"{clean_word} {next_word}"
                    if bigram in words:
                        freq = word_freq.get(bigram, 1)
                        weight = 2.0 / freq  # Bigrams are stronger signals
                        if i in negated_positions:
                            weight *= -0.5
                        score += weight

            normalized = score / max(total_weight, 1)
            if normalized > best_score:
                best_score = normalized
                best_intent = intent

        # Scale confidence — keyword matching tends to be conservative
        confidence = min(0.85, best_score * 3.5)
        return best_intent, round(confidence, 2)

    # ------------------------------------------------------------------
    # Internal — suggestions
    # ------------------------------------------------------------------

    @staticmethod
    def _get_suggestions(intent: str, language: str) -> list[str]:
        """Return suggested follow-up actions based on intent."""
        suggestions = {
            "check_booking": {
                "en": ["View QR code", "Check boarding time", "Cancel booking"],
                "fil": ["Tingnan QR code", "Oras ng pagsakay", "Kanselahin"],
                "id": ["Lihat QR code", "Cek waktu naik", "Batalkan"],
                "vi": ["Xem mã QR", "Kiểm tra giờ lên xe", "Hủy vé"],
            },
            "request_requeue": {
                "en": ["Find next bus", "Change route", "Contact support"],
                "fil": ["Hanapin susunod na bus", "Palit ng ruta"],
                "id": ["Cari bus berikutnya", "Ganti rute", "Hubungi"],
                "vi": ["Tìm chuyến sau", "Đổi tuyến", "Liên hệ"],
            },
            "get_departure_info": {
                "en": ["View schedule", "Check gate", "Set reminder"],
                "fil": ["Tingnan iskedyul", "Oras ng alis"],
                "id": ["Lihat jadwal", "Cek gerbang", "Pengingat"],
                "vi": ["Xem lịch trình", "Kiểm tra cổng", "Nhắc nhở"],
            },
            "surge_info": {
                "en": ["View forecast", "Choose different date", "Book early"],
                "fil": ["Tingnan forecast", "Pumili ng ibang petsa"],
                "id": ["Lihat prediksi", "Pilih tanggal lain", "Pesan awal"],
                "vi": ["Xem dự báo", "Chọn ngày khác", "Đặt sớm"],
            },
            "fallback": {
                "en": ["Search routes", "Check bookings", "Ask about schedules"],
                "fil": ["Maghanap ng ruta", "Tingnan booking", "Oras ng alis"],
                "id": ["Cari rute", "Cek pemesanan", "Tanya jadwal"],
                "vi": ["Tìm tuyến", "Kiểm tra vé", "Hỏi lịch trình"],
            },
        }

        lang_suggestions = suggestions.get(intent, {}).get(
            language, suggestions.get(intent, {}).get("en", [])
        )
        return lang_suggestions[:3]
