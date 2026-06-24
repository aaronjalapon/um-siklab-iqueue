"""Multilingual chatbot service for IQueue passenger support.

Supports Filipino, Bahasa Indonesia, Vietnamese, and English.
Uses a fine-tuned XLM-RoBERTa model for intent classification with
keyword-based fallback when the model is unavailable.

Intent targets:
  - greeting         — "Hello"
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
import uuid
from datetime import date, datetime, time, timezone
from pathlib import Path
from typing import Any

from langdetect import detect as detect_language_raw
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingStatus
from app.models.bus import Bus
from app.models.bus_route import BusRoute
from app.models.passenger import Passenger
from app.schemas.chatbot import ChatbotAction, ChatbotResponse

logger = logging.getLogger(__name__)

KNOWN_ROUTE_TERMS = {
    "davao",
    "cagayan",
    "cdo",
    "cotabato",
    "general santos",
    "gensan",
    "iligan",
    "butuan",
    "zamboanga",
}

ROUTE_SEARCH_TERMS = {
    "book",
    "bus",
    "buy",
    "destination",
    "from",
    "go to",
    "going to",
    "inquire",
    "inquiry",
    "route",
    "routes",
    "search",
    "ticket",
    "travel to",
    "trip",
}

# ---------------------------------------------------------------------------
# Intent keyword dictionaries per language (fallback when model unavailable)
# ---------------------------------------------------------------------------

INTENT_KEYWORDS: dict[str, dict[str, list[str]]] = {
    "en": {
        "greeting": [
            "hello", "hi", "hey", "good morning", "good afternoon",
            "good evening", "help", "start", "can i inquire",
        ],
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
            "schedule", "departure time", "gate", "platform", "route", "book",
            "routes", "search routes", "ticket", "tickets", "book ticket",
            "book a ticket", "want to book", "i want to book", "buy ticket",
            "search for ticket", "go to", "going to", "want to go",
            "cotabato", "davao", "cagayan", "cdo", "general santos",
            "gensan", "iligan", "butuan", "zamboanga", "when is",
            "bus leaves", "leaving at",
        ],
        "surge_info": [
            "crowded", "busy", "full", "surge", "peak", "holiday",
            "many people", "crowd", "packed", "how full",
            "is it busy", "is it crowded", "how crowded",
        ],
    },
    "fil": {
        "greeting": [
            "hello", "hi", "kumusta", "kamusta", "magandang umaga",
            "magandang hapon", "magandang gabi", "tulong",
        ],
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
            "anong oras alis", "kailan aalis", "papuntang", "mag book",
        ],
        "surge_info": [
            "marami", "puno", "siksikan", "maraming tao", "crowded",
            "holiday", "peak", "surge", "dami", "matao",
            "madami tao", "maraming pasahero", "karami", "gaano karami",
            "karamihan", "puno ba", "sikip",
        ],
    },
    "id": {
        "greeting": [
            "halo", "hello", "hi", "hai", "selamat pagi", "selamat siang",
            "selamat malam", "bantuan",
        ],
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
            "pintu", "gate", "platform", "jam berapa", "pesan tiket",
        ],
        "surge_info": [
            "ramai", "penuh", "padat", "banyak orang", "crowded",
            "liburan", "puncak", "lonjakan", "sepi", "sibuk",
        ],
    },
    "vi": {
        "greeting": [
            "xin chào", "chào", "hello", "hi", "chào buổi sáng",
            "chào buổi tối", "giúp",
        ],
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
            "giờ", "cổng", "bến", "mấy giờ đi", "đặt vé",
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

GREETING_RESPONSES: dict[str, str] = {
    "en": "Hello! I can help with booking status, bus schedules, rebooking, and crowd forecasts. What would you like to do?",
    "fil": "Kumusta! Matutulungan kitang tingnan ang booking, iskedyul ng bus, rebooking, at dami ng tao. Ano ang gusto mong gawin?",
    "id": "Halo! Saya bisa membantu memeriksa pemesanan, jadwal bus, pemesanan ulang, dan prediksi keramaian. Apa yang ingin Anda lakukan?",
    "vi": "Xin chào! Tôi có thể giúp kiểm tra đặt vé, lịch xe, đặt lại vé, và dự báo đông đúc. Bạn muốn làm gì?",
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


def decode_model_label(
    label: str | int,
    id_to_label: dict[int, str],
) -> str:
    """Normalize Transformers labels into an IQueue intent name.

    Fine-tuned checkpoints may emit semantic labels (``surge_info``), while
    older checkpoints emit numeric labels (``LABEL_3`` or ``3``). Supporting
    both formats prevents a healthy classifier from silently degrading to the
    keyword fallback.
    """

    value = str(label)
    if value in id_to_label.values():
        return value
    if value.startswith("LABEL_"):
        value = value.removeprefix("LABEL_")
    try:
        return id_to_label.get(int(value), "fallback")
    except ValueError:
        return "fallback"


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

                intent = decode_model_label(best["label"], self._id_to_label)
                confidence = round(best["score"], 4)

                # Per-language confidence threshold
                offset = LANGUAGE_CONFIDENCE_OFFSET.get(language, 0.0)
                min_conf = BASE_MIN_CONFIDENCE + offset
                if confidence < min_conf:
                    intent = "fallback"

                all_scores = {}
                for r in results:
                    r_intent = decode_model_label(r["label"], self._id_to_label)
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

        from app.services.chatbot.session import SessionManager

        # Step 2: Load session context if available
        session_context: dict[str, Any] | None = None
        if session_id and db:
            try:
                session_ctx = await SessionManager.get_context(db, session_id)
                if session_ctx:
                    session_context = session_ctx
            except Exception:
                logger.warning("Failed to load session context for %s", session_id)

        query_entities = SessionManager.extract_entities(query, "")

        # Merge identifiers from request, session context, and current message.
        effective_booking_id = booking_id
        if not effective_booking_id and session_context and session_context.get("booking_id"):
            try:
                effective_booking_id = uuid.UUID(str(session_context["booking_id"]))
            except (TypeError, ValueError):
                effective_booking_id = None
        if not effective_booking_id and query_entities.get("booking_id"):
            try:
                effective_booking_id = uuid.UUID(str(query_entities["booking_id"]))
            except (TypeError, ValueError):
                effective_booking_id = None

        effective_phone = phone
        if not effective_phone and session_context:
            effective_phone = session_context.get("phone")
        if not effective_phone:
            effective_phone = query_entities.get("phone")

        greeting_intent, greeting_confidence = self._classify_intent_fallback(
            query, detected_lang
        )
        if greeting_intent == "greeting":
            actions = self._get_actions("greeting", detected_lang, query_entities)
            return (
                ChatbotResponse(
                    response_text=GREETING_RESPONSES.get(
                        detected_lang, GREETING_RESPONSES["en"]
                    ),
                    detected_language=detected_lang,
                    language_confidence=round(lang_confidence, 4),
                    intent="greeting",
                    suggested_actions=self._get_suggestions("greeting", detected_lang),
                    actions=actions,
                    confidence=max(greeting_confidence, 0.9),
                    session_id=session_id,
                    degradation_level=degradation,
                ),
                {"intent": "greeting", "entities": {}, "language": detected_lang},
                degradation,
            )

        if self._is_identity_question(query):
            actions = self._get_actions("identity", detected_lang, query_entities)
            response_text = self._identity_response(detected_lang)
            return (
                ChatbotResponse(
                    response_text=response_text,
                    detected_language=detected_lang,
                    language_confidence=round(lang_confidence, 4),
                    intent="fallback",
                    suggested_actions=self._get_suggestions("identity", detected_lang),
                    actions=actions,
                    confidence=0.8,
                    session_id=session_id,
                    degradation_level=degradation,
                ),
                {"intent": "fallback", "entities": query_entities, "language": detected_lang},
                degradation,
            )

        route_intent, route_confidence = self._detect_route_search_intent(query)
        if route_intent:
            route_degradation = degradation
            route_context: dict[str, Any] = {}
            response_text = ""
            if db:
                route_degradation, response_text, route_context = (
                    await self._handle_departure_info(
                        db,
                        query,
                        session_context,
                        query_entities,
                        detected_lang,
                        degradation,
                    )
                )
            if not response_text:
                response_text = self._route_search_response(
                    query, detected_lang, query_entities
                )
            actions = self._get_actions(
                route_intent,
                detected_lang,
                query_entities,
                session_context,
                route_context,
            )
            return (
                ChatbotResponse(
                    response_text=response_text,
                    detected_language=detected_lang,
                    language_confidence=round(lang_confidence, 4),
                    intent=route_intent,
                    suggested_actions=self._get_suggestions(route_intent, detected_lang),
                    actions=actions,
                    confidence=route_confidence,
                    session_id=session_id,
                    degradation_level=route_degradation,
                ),
                {
                    "intent": route_intent,
                    "entities": {**query_entities, **route_context},
                    "language": detected_lang,
                },
                route_degradation,
            )

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

        # Step 4: Extract entities from this query with the final intent.
        entities = SessionManager.extract_entities(query, intent)
        if not effective_booking_id and entities.get("booking_id"):
            try:
                effective_booking_id = uuid.UUID(str(entities["booking_id"]))
            except (TypeError, ValueError):
                effective_booking_id = None
        if not effective_phone and entities.get("phone"):
            effective_phone = entities["phone"]

        if intent == "fallback":
            if effective_booking_id or effective_phone:
                intent = "check_booking"
            elif entities.get("origin") or entities.get("destination"):
                previous_intent = session_context.get("intent") if session_context else None
                intent = "surge_info" if previous_intent == "surge_info" else "get_departure_info"

        # Step 5: Build response based on intent (with real data when available)
        response_text = ""
        suggested_actions: list[str] = []
        action_context: dict[str, Any] = {}

        if intent == "check_booking" and db:
            degradation, response_text, action_context = await self._handle_check_booking(
                db, effective_booking_id, effective_phone, detected_lang, degradation,
            )
            if degradation >= 4:
                # Lookup failed completely — fall through to template
                response_text = ""

        if not response_text and intent == "surge_info" and db:
            degradation, response_text, action_context = await self._handle_surge_info(
                db, query, session_context, entities, detected_lang, degradation,
            )

        if not response_text and intent == "get_departure_info" and db:
            degradation, response_text, action_context = await self._handle_departure_info(
                db, query, session_context, entities, detected_lang, degradation,
            )

        if not response_text and intent == "request_requeue" and db:
            degradation, response_text, action_context = await self._handle_requeue_start(
                db, effective_phone, effective_booking_id, session_context,
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

        suggestion_intent = self._suggestion_intent(intent, entities, action_context)
        suggested_actions = self._get_suggestions(suggestion_intent, detected_lang)
        actions = self._get_actions(
            suggestion_intent,
            detected_lang,
            entities,
            session_context,
            action_context,
        )

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
            "entities": {**entities, **action_context},
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
                actions=actions,
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
    ) -> tuple[int, str, dict[str, Any]]:
        """Look up a booking by ID or phone and return a status message."""
        booking: Booking | None = None

        if not booking_id and not phone:
            templates = {
                "en": "I can check that for you. Please send your booking ID or the phone number you used when booking.",
                "fil": "Matitingnan ko iyan. Pakisend ang booking ID o numerong ginamit mo sa pag-book.",
                "id": "Saya bisa mengeceknya. Kirim ID pemesanan atau nomor telepon yang digunakan saat memesan.",
                "vi": "Tôi có thể kiểm tra. Vui lòng gửi mã đặt vé hoặc số điện thoại bạn đã dùng khi đặt vé.",
            }
            return degradation, templates.get(language, templates["en"]), {}

        try:
            if booking_id:
                result = await db.execute(
                    select(Booking).where(Booking.id == booking_id)
                )
                booking = result.scalars().first()
            elif phone:
                # Find passenger by phone, then latest booking
                normalized_phone = self._normalize_phone(phone)
                p_result = await db.execute(
                    select(Passenger).where(
                        func.replace(func.replace(Passenger.phone, "-", ""), " ", "")
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
        except Exception as exc:
            logger.warning("Booking lookup failed: %s", exc)
            return max(degradation, 3), "", {}

        if not booking:
            templates = {
                "en": "I couldn't find a booking with that information. Please double-check your booking ID or phone number and try again.",
                "fil": "Hindi ko mahanap ang booking. Pakitingnan muli ang iyong booking ID o numero ng telepono at subukan ulit.",
                "id": "Saya tidak dapat menemukan pemesanan dengan informasi tersebut. Silakan periksa kembali ID pemesanan atau nomor telepon Anda.",
                "vi": "Tôi không tìm thấy đặt vé với thông tin đó. Vui lòng kiểm tra lại mã đặt vé hoặc số điện thoại.",
            }
            return degradation, templates.get(language, templates["en"]), {}

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
        route: BusRoute | None = None
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

        qr_available = bool(booking.qr_token)

        templates = {
            "en": f"Your booking is {status_text}.{route_info} Seat: {booking.seat_number}. "
                  f"Departure: {booking.departure_date.strftime('%B %d, %Y')}. "
                  f"Boarding window: {booking.boarding_window_start.strftime('%H:%M')} → "
                  f"{booking.boarding_window_end.strftime('%H:%M')}. "
                  f"QR code: {'available' if qr_available else 'not generated yet'}.",
            "fil": f"Ang iyong booking ay {status_text}.{route_info} Upuan: {booking.seat_number}. "
                   f"Alis: {booking.departure_date.strftime('%B %d, %Y')}. "
                   f"Oras ng pagsakay: {booking.boarding_window_start.strftime('%H:%M')} → "
                   f"{booking.boarding_window_end.strftime('%H:%M')}. "
                   f"QR code: {'available' if qr_available else 'hindi pa nagagawa'}.",
            "id": f"Pemesanan Anda {status_text}.{route_info} Kursi: {booking.seat_number}. "
                  f"Keberangkatan: {booking.departure_date.strftime('%B %d, %Y')}. "
                  f"Waktu naik: {booking.boarding_window_start.strftime('%H:%M')} → "
                  f"{booking.boarding_window_end.strftime('%H:%M')}. "
                  f"Kode QR: {'tersedia' if qr_available else 'belum dibuat'}.",
            "vi": f"Đặt vé của bạn {status_text}.{route_info} Ghế: {booking.seat_number}. "
                  f"Khởi hành: {booking.departure_date.strftime('%B %d, %Y')}. "
                  f"Giờ lên xe: {booking.boarding_window_start.strftime('%H:%M')} → "
                  f"{booking.boarding_window_end.strftime('%H:%M')}. "
                  f"Mã QR: {'có sẵn' if qr_available else 'chưa được tạo'}.",
        }

        action_context = {
            "booking_id": str(booking.id),
            "has_qr": qr_available,
            "date": booking.departure_date.date().isoformat(),
        }
        if route:
            action_context.update(
                {
                    "origin": route.origin,
                    "destination": route.destination,
                    "route_id": str(route.id),
                }
            )

        return degradation, templates.get(language, templates["en"]), action_context

    async def _handle_surge_info(
        self,
        db: AsyncSession,
        query: str,
        session_context: dict[str, Any] | None,
        entities: dict[str, Any],
        language: str,
        degradation: int,
    ) -> tuple[int, str, dict[str, Any]]:
        """Query real surge forecast for a route."""
        action_context: dict[str, Any] = {}
        try:
            from app.services.forecasting.predictor import (
                ForecastingService,
            )

            # Determine route from this turn plus accumulated context.
            origin, destination = self._resolve_route_entities(entities, session_context)

            if not origin:
                # Try to match route from query
                route_cities = entities.get("route_cities", [])
                if len(route_cities) >= 2:
                    origin, destination = route_cities[0], route_cities[-1]

            if not origin:
                response_map = {
                    "en": "I can check crowd levels for you. Which route and travel date should I use?",
                    "fil": "Maaari kong tingnan ang dami ng tao. Anong ruta at petsa ng biyahe ang gagamitin ko?",
                    "id": "Saya bisa memeriksa tingkat keramaian. Rute dan tanggal perjalanan mana yang harus saya gunakan?",
                    "vi": "Tôi có thể kiểm tra mức độ đông đúc. Bạn muốn kiểm tra tuyến và ngày đi nào?",
                }
                return degradation, response_map.get(language, response_map["en"]), {}

            # Find matching route
            route_result = await db.execute(
                select(BusRoute).where(
                    func.lower(BusRoute.origin).contains(origin.lower()),
                    func.lower(BusRoute.destination).contains(destination.lower() if destination else origin.lower()),
                ).limit(1)
            )
            route = route_result.scalars().first()

            if not route:
                return degradation, "", {}

            travel_day = self._resolve_travel_day(entities, session_context)
            action_context = {
                "origin": route.origin,
                "destination": route.destination,
                "route_id": str(route.id),
                "date": travel_day.isoformat(),
            }

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
                return degradation, response_map.get(language, response_map["en"]), action_context

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
                      + "\n\nI recommend booking early for the high-surge days.",
                "fil": f"Surge forecast para sa {route.origin} → {route.destination} ngayong linggo:\n"
                       + "\n".join(f"• {d}" for d in day_strs)
                       + "\n\nInirerekomenda kong mag-book nang maaga para sa mga araw na mataas ang surge.",
            }
            return degradation, response_map.get(language, response_map["en"]), action_context

        except Exception as exc:
            logger.warning("Surge info lookup failed: %s", exc)
            return max(degradation, 3), "", {}

    async def _handle_departure_info(
        self,
        db: AsyncSession,
        query: str,
        session_context: dict[str, Any] | None,
        entities: dict[str, Any],
        language: str,
        degradation: int,
    ) -> tuple[int, str, dict[str, Any]]:
        """Query real bus departure schedule for a route."""
        action_context: dict[str, Any] = {}
        try:
            origin, destination = self._resolve_route_entities(
                entities, session_context
            )
            if not origin or not destination:
                route_cities = entities.get("route_cities", [])
                if len(route_cities) >= 2:
                    origin, destination = route_cities[0], route_cities[-1]

            if not origin or not destination:
                response_text, partial_context = self._route_collection_prompt(
                    language, origin, destination, entities, session_context
                )
                return degradation, response_text, partial_context

            if not self._has_travel_date(entities, session_context):
                response_text, partial_context = self._route_collection_prompt(
                    language, origin, destination, entities, session_context
                )
                return degradation, response_text, partial_context

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
                if origin and destination:
                    travel_day = self._resolve_travel_day(entities, session_context)
                    return degradation, "", {
                        "origin": origin.title(),
                        "destination": destination.title(),
                        "date": travel_day.isoformat(),
                    }
                return degradation, "", {}

            travel_day = self._resolve_travel_day(entities, session_context)
            action_context = {
                "origin": routes[0].origin,
                "destination": routes[0].destination,
                "date": travel_day.isoformat(),
                "route_id": str(routes[0].id),
            }

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
                    "id": f"Saya menemukan rute {routes[0].origin} → {routes[0].destination}, tetapi belum ada bus terjadwal. Silakan cek lagi nanti.",
                    "vi": f"Tôi tìm thấy tuyến {routes[0].origin} → {routes[0].destination}, nhưng hiện chưa có xe được lên lịch. Vui lòng kiểm tra lại sau.",
                }
                return degradation, response_map.get(language, response_map["en"]), action_context

            # Format bus list
            bus_lines = []
            for bus in all_buses[:5]:
                # Count booked seats to show availability
                booked_count_result = await db.execute(
                    select(func.count()).select_from(Booking).where(
                        Booking.bus_id == bus.id,
                        Booking.departure_date >= datetime.combine(
                            travel_day, time.min, tzinfo=timezone.utc
                        ),
                        Booking.departure_date <= datetime.combine(
                            travel_day, time.max, tzinfo=timezone.utc
                        ),
                        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
                    )
                )
                booked = booked_count_result.scalar() or 0
                available = max(0, bus.capacity - booked)
                bus_lines.append(f"Bus {bus.plate_number} · {available} seats available")

            response_map = {
                "en": f"{len(all_buses)} buses found for {routes[0].origin} → {routes[0].destination} on {travel_day.strftime('%B %d, %Y')}:\n"
                      + "\n".join(f"• {b}" for b in bus_lines)
                      + "\n\nUse Search and book to choose a bus, passenger details, and seat.",
                "fil": f"{len(all_buses)} bus ang nakita para sa {routes[0].origin} → {routes[0].destination} sa {travel_day.strftime('%B %d, %Y')}:\n"
                       + "\n".join(f"• {b}" for b in bus_lines)
                       + "\n\nGamitin ang Search and book para pumili ng bus, detalye ng pasahero, at upuan.",
                "id": f"{len(all_buses)} bus ditemukan untuk {routes[0].origin} → {routes[0].destination} pada {travel_day.strftime('%B %d, %Y')}:\n"
                      + "\n".join(f"• {b}" for b in bus_lines)
                      + "\n\nGunakan Search and book untuk memilih bus, detail penumpang, dan kursi.",
                "vi": f"Tìm thấy {len(all_buses)} xe cho tuyến {routes[0].origin} → {routes[0].destination} vào {travel_day.strftime('%B %d, %Y')}:\n"
                      + "\n".join(f"• {b}" for b in bus_lines)
                      + "\n\nDùng Search and book để chọn xe, thông tin hành khách, và ghế.",
            }
            return degradation, response_map.get(language, response_map["en"]), action_context

        except Exception as exc:
            logger.warning("Departure info lookup failed: %s", exc)
            return max(degradation, 3), "", {}

    async def _handle_requeue_start(
        self,
        db: AsyncSession,
        phone: str | None,
        booking_id: uuid.UUID | None,
        session_context: dict[str, Any] | None,
        entities: dict[str, Any],
        language: str,
        degradation: int,
    ) -> tuple[int, str, dict[str, Any]]:
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
                return degradation, response_map.get(language, response_map["en"]), {
                    "flow": "rebooking",
                    "step": "identify",
                }

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
            return degradation, response_map.get(language, response_map["en"]), {
                "booking_id": str(booking.id),
                "flow": "rebooking",
                "step": "identify",
            }

        except Exception as exc:
            logger.warning("Requeue start failed: %s", exc)
            return max(degradation, 3), "", {}

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

    @staticmethod
    def _detect_route_search_intent(query: str) -> tuple[str | None, float]:
        """Detect route/ticket search phrases before the ML fallback gate."""

        query_lower = query.lower().strip()
        has_route_term = any(term in query_lower for term in ROUTE_SEARCH_TERMS)
        has_known_city = any(term in query_lower for term in KNOWN_ROUTE_TERMS)

        if has_route_term and has_known_city:
            return "get_departure_info", 0.9
        if any(term in query_lower for term in ("i want to book", "want to book", "book a ticket", "buy ticket")):
            return "get_departure_info", 0.88
        if has_known_city and query_lower.startswith(("i want", "want", "to ")):
            return "get_departure_info", 0.85
        if "search routes" in query_lower or "search for routes" in query_lower:
            return "get_departure_info", 0.85

        return None, 0.0

    @staticmethod
    def _route_search_response(
        query: str, language: str, entities: dict[str, Any] | None = None
    ) -> str:
        """Return a route-search prompt with destination context when present."""

        query_lower = query.lower()
        entities = entities or {}
        origin = entities.get("origin")
        destination = entities.get("destination") or next(
            (term.title() for term in KNOWN_ROUTE_TERMS if term in query_lower), None
        )
        date_text = entities.get("date_text")

        if origin and destination and date_text:
            return (
                f"I found {origin.title()} → {destination.title()} for {date_text}. "
                "Use Search and book to choose a bus, passenger details, and seat."
            )

        if language == "fil":
            if destination:
                return f"Makakatulong ako maghanap ng biyahe papuntang {destination}. Ano ang pinanggagalingan mo at anong petsa ng biyahe?"
            return "Makakatulong ako maghanap ng ruta. Pakibigay ang pinanggagalingan, destinasyon, at petsa ng biyahe."
        if language == "id":
            if destination:
                return f"Saya bisa membantu mencari perjalanan ke {destination}. Dari mana Anda berangkat dan tanggal berapa?"
            return "Saya bisa membantu mencari rute. Mohon berikan asal, tujuan, dan tanggal perjalanan."
        if language == "vi":
            if destination:
                return f"Tôi có thể giúp tìm chuyến đi đến {destination}. Bạn khởi hành từ đâu và vào ngày nào?"
            return "Tôi có thể giúp tìm tuyến xe. Vui lòng cho biết điểm đi, điểm đến, và ngày đi."

        if destination:
            return f"I can help search trips to {destination}. Where are you coming from, and what travel date should I use?"
        return "I can help search routes. Please tell me your origin, destination, and travel date."

    @staticmethod
    def _is_identity_question(query: str) -> bool:
        """Detect passenger identity/privacy questions."""
        q = query.lower().strip()
        return any(
            phrase in q
            for phrase in (
                "do you know me",
                "who am i",
                "kilala mo ba ako",
                "apakah kamu tahu saya",
                "bạn có biết tôi",
            )
        )

    @staticmethod
    def _identity_response(language: str) -> str:
        """Return a privacy-safe identity response."""
        responses = {
            "en": "I don't know who you are until you share a booking ID or phone number for lookup. I only use that information to find your booking details.",
            "fil": "Hindi ko alam kung sino ka hangga't hindi ka nagbibigay ng booking ID o numero para sa lookup. Ginagamit ko lang iyon para hanapin ang booking mo.",
            "id": "Saya tidak tahu siapa Anda sampai Anda memberikan ID pemesanan atau nomor telepon untuk pencarian. Informasi itu hanya dipakai untuk menemukan pemesanan Anda.",
            "vi": "Tôi không biết bạn là ai cho đến khi bạn cung cấp mã đặt vé hoặc số điện thoại để tra cứu. Tôi chỉ dùng thông tin đó để tìm đặt vé của bạn.",
        }
        return responses.get(language, responses["en"])

    @staticmethod
    def _normalize_phone(phone: str) -> str:
        """Normalize phone input for loose passenger lookup."""
        normalized = phone.replace("-", "").replace(" ", "")
        if normalized.startswith("+63"):
            normalized = "0" + normalized[3:]
        return normalized

    @staticmethod
    def _resolve_travel_day(
        entities: dict[str, Any], session_context: dict[str, Any] | None
    ) -> date:
        """Resolve travel date from current entities, session, or today."""
        raw_date = entities.get("date") or (
            session_context.get("date") if session_context else None
        )
        if raw_date:
            try:
                return date.fromisoformat(str(raw_date))
            except ValueError:
                pass
        return date.today()

    @staticmethod
    def _resolve_route_entities(
        entities: dict[str, Any], session_context: dict[str, Any] | None
    ) -> tuple[str | None, str | None]:
        """Merge origin/destination from this turn and previous turns."""
        context = session_context or {}
        origin = entities.get("origin") or context.get("origin")
        destination = entities.get("destination") or context.get("destination")

        nested_entities = context.get("entities")
        if isinstance(nested_entities, dict):
            origin = origin or nested_entities.get("origin")
            destination = destination or nested_entities.get("destination")

        return origin, destination

    @staticmethod
    def _has_travel_date(
        entities: dict[str, Any], session_context: dict[str, Any] | None
    ) -> bool:
        """Return true when the user/session supplied an explicit travel date."""
        if entities.get("date"):
            return True
        context = session_context or {}
        if context.get("date"):
            return True
        nested_entities = context.get("entities")
        return isinstance(nested_entities, dict) and bool(nested_entities.get("date"))

    @staticmethod
    def _route_collection_prompt(
        language: str,
        origin: str | None,
        destination: str | None,
        entities: dict[str, Any],
        session_context: dict[str, Any] | None,
    ) -> tuple[str, dict[str, Any]]:
        """Ask for missing route/date details while preserving known pieces."""
        travel_day = entities.get("date") or (
            session_context.get("date") if session_context else None
        )
        context = {
            "origin": origin,
            "destination": destination,
            "date": travel_day,
            "step": "route_collect",
        }
        clean_context = {k: v for k, v in context.items() if v}

        if origin and destination and not travel_day:
            templates = {
                "en": "Got it: {origin} → {destination}. What travel date should I use?",
                "fil": "Sige: {origin} → {destination}. Anong petsa ng biyahe?",
                "id": "Baik: {origin} → {destination}. Tanggal perjalanan kapan?",
                "vi": "Đã rõ: {origin} → {destination}. Bạn muốn đi ngày nào?",
            }
            return (
                templates.get(language, templates["en"]).format(
                    origin=origin.title(), destination=destination.title()
                ),
                clean_context,
            )

        if destination and not origin:
            templates = {
                "en": "Got {destination} as your destination. Where are you coming from, and what travel date should I use?",
                "fil": "Nakuha ko ang destinasyon mong {destination}. Saan ka manggagaling, at anong petsa ng biyahe?",
                "id": "Saya sudah mencatat tujuan Anda ke {destination}. Dari mana berangkat, dan tanggal berapa?",
                "vi": "Tôi đã ghi nhận điểm đến là {destination}. Bạn xuất phát từ đâu và đi ngày nào?",
            }
            return (
                templates.get(language, templates["en"]).format(
                    destination=destination.title()
                ),
                clean_context,
            )

        if origin and not destination:
            templates = {
                "en": "Got {origin} as your origin. Where are you going, and what travel date should I use?",
                "fil": "Nakuha ko ang pinanggagalingan mo na {origin}. Saan ka pupunta, at anong petsa?",
                "id": "Saya mencatat asal Anda dari {origin}. Tujuannya ke mana, dan tanggal berapa?",
                "vi": "Tôi đã ghi nhận điểm đi là {origin}. Bạn muốn đến đâu và đi ngày nào?",
            }
            return (
                templates.get(language, templates["en"]).format(origin=origin.title()),
                clean_context,
            )

        templates = {
            "en": "I can help search routes. Please tell me your origin, destination, and travel date.",
            "fil": "Makakatulong ako maghanap ng ruta. Pakibigay ang pinanggagalingan, destinasyon, at petsa.",
            "id": "Saya bisa membantu mencari rute. Mohon berikan asal, tujuan, dan tanggal perjalanan.",
            "vi": "Tôi có thể giúp tìm tuyến xe. Vui lòng cho biết điểm đi, điểm đến, và ngày đi.",
        }
        return templates.get(language, templates["en"]), clean_context

    @staticmethod
    def _suggestion_intent(
        intent: str, entities: dict[str, Any], action_context: dict[str, Any]
    ) -> str:
        """Choose the legacy suggestion set for the concrete response state."""
        if intent == "check_booking" and not action_context.get("booking_id"):
            return "booking_identify"
        if action_context.get("step") == "route_collect":
            return "route_identify"
        if intent == "get_departure_info" and not (
            action_context.get("origin")
            or action_context.get("destination")
            or entities.get("origin")
            or entities.get("destination")
        ):
            return "route_identify"
        if intent == "surge_info" and not (
            action_context.get("origin") or entities.get("origin")
        ):
            return "surge_prompt"
        if intent == "request_requeue" and action_context.get("step") == "identify":
            return "booking_identify"
        return intent

    @staticmethod
    def _get_actions(
        intent: str,
        language: str,
        entities: dict[str, Any] | None = None,
        session_context: dict[str, Any] | None = None,
        action_context: dict[str, Any] | None = None,
    ) -> list[ChatbotAction]:
        """Return structured actions matching the response state."""
        context: dict[str, Any] = {}
        for source in (session_context or {}, entities or {}, action_context or {}):
            context.update({k: v for k, v in source.items() if v is not None})

        actions: list[ChatbotAction] = []

        def send(action_id: str, label: str, message: str) -> None:
            actions.append(
                ChatbotAction(
                    id=action_id,
                    label=label,
                    kind="send_message",
                    payload={"message": message},
                )
            )

        if intent == "greeting":
            send("book-ticket", "Book a ticket", "I want to book")
            send("check-booking", "Check my booking", "Check my booking")
            send("crowd-levels", "Ask about crowd levels", "Is it crowded?")
            send("rebook-missed", "Rebook missed bus", "I missed my bus")
            return actions

        if context.get("booking_id"):
            booking_payload = {"booking_id": str(context["booking_id"])}
            actions.append(
                ChatbotAction(
                    id="open-booking",
                    label="View booking",
                    kind="open_booking",
                    payload=booking_payload,
                )
            )
            if context.get("has_qr", True):
                actions.append(
                    ChatbotAction(
                        id="open-qr",
                        label="View QR code",
                        kind="open_qr",
                        payload=booking_payload,
                    )
                )

        origin = context.get("origin")
        destination = context.get("destination")
        travel_date = context.get("date")
        if intent in {"get_departure_info", "surge_info"} and (origin or destination):
            payload = {
                "origin": origin,
                "destination": destination,
                "date": travel_date,
                "route_id": context.get("route_id"),
            }
            actions.append(
                ChatbotAction(
                    id="search-and-book",
                    label="Search and book",
                    kind="prefill_route_search",
                    payload={k: v for k, v in payload.items() if v},
                )
            )

        if intent == "booking_identify":
            send("send-booking-id", "Enter booking ID", "I have a booking ID")
            send("send-phone", "Use phone number", "I want to use my phone number")

        if intent == "route_identify":
            send(
                "add-route-date",
                "Add route and date",
                "Davao to Cotabato tomorrow",
            )
            send("ask-crowds", "Ask crowd levels", "Is it crowded tomorrow?")

        if intent == "surge_prompt":
            send("share-route", "Share route", "Davao to Cotabato tomorrow")

        if intent == "fallback":
            send("search-routes", "Search routes", "I want to book")
            send("check-booking", "Check booking", "Check my booking")

        if intent == "identity":
            send("check-booking", "Check my booking", "Check my booking")

        if intent == "request_requeue" and not actions:
            send("continue-rebooking", "Continue rebooking", "Continue rebooking")

        return actions[:4]

    # ------------------------------------------------------------------
    # Internal — suggestions
    # ------------------------------------------------------------------

    @staticmethod
    def _get_suggestions(intent: str, language: str) -> list[str]:
        """Return suggested follow-up actions based on intent."""
        suggestions = {
            "check_booking": {
                "en": ["View booking", "View QR code", "Check boarding time"],
                "fil": ["Tingnan booking", "Tingnan QR code", "Oras ng pagsakay"],
                "id": ["Lihat pemesanan", "Lihat QR code", "Cek waktu naik"],
                "vi": ["Xem đặt vé", "Xem mã QR", "Kiểm tra giờ lên xe"],
            },
            "booking_identify": {
                "en": ["Enter booking ID", "Use phone number", "Contact support"],
                "fil": ["Ilagay booking ID", "Gamitin phone number", "Humingi ng tulong"],
                "id": ["Masukkan ID pemesanan", "Gunakan nomor telepon", "Hubungi bantuan"],
                "vi": ["Nhập mã đặt vé", "Dùng số điện thoại", "Liên hệ hỗ trợ"],
            },
            "request_requeue": {
                "en": ["Find next bus", "Change route", "Contact support"],
                "fil": ["Hanapin susunod na bus", "Palit ng ruta"],
                "id": ["Cari bus berikutnya", "Ganti rute", "Hubungi"],
                "vi": ["Tìm chuyến sau", "Đổi tuyến", "Liên hệ"],
            },
            "get_departure_info": {
                "en": ["Search and book", "Choose different date", "Check crowd levels"],
                "fil": ["Search and book", "Pumili ng ibang petsa", "Tingnan crowd levels"],
                "id": ["Search and book", "Pilih tanggal lain", "Cek keramaian"],
                "vi": ["Search and book", "Chọn ngày khác", "Kiểm tra đông đúc"],
            },
            "route_identify": {
                "en": ["Add route and date", "Example route", "Ask crowd levels"],
                "fil": ["Idagdag ruta at petsa", "Halimbawa ng ruta", "Tanong sa crowd"],
                "id": ["Tambah rute dan tanggal", "Contoh rute", "Tanya keramaian"],
                "vi": ["Thêm tuyến và ngày", "Tuyến ví dụ", "Hỏi mức đông"],
            },
            "surge_info": {
                "en": ["Search and book", "Choose different date", "Ask another route"],
                "fil": ["Search and book", "Pumili ng ibang petsa", "Ibang ruta"],
                "id": ["Search and book", "Pilih tanggal lain", "Tanya rute lain"],
                "vi": ["Search and book", "Chọn ngày khác", "Hỏi tuyến khác"],
            },
            "surge_prompt": {
                "en": ["Share route", "Search routes", "Book a ticket"],
                "fil": ["Ibigay ruta", "Maghanap ng ruta", "Mag-book"],
                "id": ["Bagikan rute", "Cari rute", "Pesan tiket"],
                "vi": ["Gửi tuyến", "Tìm tuyến", "Đặt vé"],
            },
            "greeting": {
                "en": ["Book a ticket", "Check my booking", "Ask about crowd levels"],
                "fil": ["Mag-book", "Tingnan booking", "Magtanong sa crowd levels"],
                "id": ["Pesan tiket", "Cek pemesanan", "Tanya keramaian"],
                "vi": ["Đặt vé", "Kiểm tra vé", "Hỏi mức đông"],
            },
            "fallback": {
                "en": ["Book a ticket", "Check my booking", "Ask about crowd levels"],
                "fil": ["Maghanap ng ruta", "Tingnan booking", "Oras ng alis"],
                "id": ["Cari rute", "Cek pemesanan", "Tanya jadwal"],
                "vi": ["Tìm tuyến", "Kiểm tra vé", "Hỏi lịch trình"],
            },
            "identity": {
                "en": ["Check my booking", "Use phone number", "Contact support"],
                "fil": ["Tingnan booking", "Gamitin phone number", "Humingi ng tulong"],
                "id": ["Cek pemesanan", "Gunakan nomor telepon", "Hubungi bantuan"],
                "vi": ["Kiểm tra vé", "Dùng số điện thoại", "Liên hệ hỗ trợ"],
            },
        }

        lang_suggestions = suggestions.get(intent, {}).get(
            language, suggestions.get(intent, {}).get("en", [])
        )
        return lang_suggestions[:3]
