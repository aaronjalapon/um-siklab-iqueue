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
from pathlib import Path
from uuid import UUID

from langdetect import detect as detect_language
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingStatus
from app.models.bus import Bus
from app.models.bus_route import BusRoute
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
        ],
        "request_requeue": [
            "missed", "late", "rebook", "missed my bus", "change booking",
            "another bus", "next bus", "reschedule", "left behind",
        ],
        "get_departure_info": [
            "departure", "leave", "depart", "what time", "when does",
            "schedule", "departure time", "gate", "platform",
        ],
        "surge_info": [
            "crowded", "busy", "full", "surge", "peak", "holiday",
            "many people", "crowd", "packed", "how full",
        ],
    },
    "fil": {
        "check_booking": [
            "booking", "tiket", "nasaan", "booking ko", "reserbasyon",
            "tingnan", "status", "kumpirma",
        ],
        "request_requeue": [
            "naiwan", "huli", "na-miss", "missed", "lumipat",
            "ibang bus", "susunod", "palit", "rebook",
        ],
        "get_departure_info": [
            "alis", "aalis", "kailan", "oras", "schedule",
            "iskedyul", "departure", "gate", "anong oras",
        ],
        "surge_info": [
            "marami", "puno", "siksikan", "maraming tao", "crowded",
            "holiday", "peak", "surge", "dami",
        ],
    },
    "id": {
        "check_booking": [
            "booking", "tiket", "pesanan", "di mana", "status",
            "konfirmasi", "cek", "reservasi",
        ],
        "request_requeue": [
            "ketinggalan", "telat", "terlambat", "ganti", "rebook",
            "bus lain", "berikutnya", "jadwal ulang",
        ],
        "get_departure_info": [
            "berangkat", "keberangkatan", "kapan", "jam", "jadwal",
            "pintu", "gate", "platform",
        ],
        "surge_info": [
            "ramai", "penuh", "padat", "banyak orang", "crowded",
            "liburan", "puncak", "lonjakan",
        ],
    },
    "vi": {
        "check_booking": [
            "đặt chỗ", "vé", "booking", "đâu", "trạng thái",
            "xác nhận", "kiểm tra", "đặt vé",
        ],
        "request_requeue": [
            "lỡ", "muộn", "trễ", "đổi", "chuyến sau",
            "xe khác", "đặt lại", "dời lịch",
        ],
        "get_departure_info": [
            "khởi hành", "đi", "khi nào", "mấy giờ", "lịch trình",
            "giờ", "cổng", "bến",
        ],
        "surge_info": [
            "đông", "đầy", "chật", "nhiều người", "cao điểm",
            "lễ", "tết", "đông đúc",
        ],
    },
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
                    # Keys are strings in JSON; convert to int
                    self._id_to_label = {
                        int(k): v for k, v in label_map_str.items()
                    }
                else:
                    # Fallback hard-coded label map
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
                # results is list of {label, score} dicts
                best = max(results, key=lambda x: x["score"])

                # Parse label — handle both "LABEL_0" and "0" formats
                label_str = best["label"]
                if label_str.startswith("LABEL_"):
                    label_idx = int(label_str.split("_")[1])
                else:
                    label_idx = int(label_str)

                intent = self._id_to_label.get(label_idx, "fallback")
                confidence = round(best["score"], 4)

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

    async def respond(
        self,
        query: str,
        language: str | None = None,
        booking_id: UUID | None = None,
        db: AsyncSession | None = None,
    ) -> ChatbotResponse:
        """Process a user query and return a chatbot response.

        Args:
            query: The user's question text.
            language: ISO 639-1 language code (auto-detected if None).
            booking_id: Optional booking context for personalised responses.
            db: Optional database session for booking lookups.

        Returns:
            ChatbotResponse with response text, detected language, intent,
            suggested actions, and confidence.
        """
        # Step 1: Detect language
        if language and language in self.SUPPORTED_LANGUAGES:
            detected_lang = language
        else:
            detected_lang = self._detect_language(query)

        # Step 2: Classify intent (async-safe via thread pool when using model)
        if self._model_available:
            classification = await asyncio.to_thread(
                self.classify, query, detected_lang
            )
        else:
            classification = self.classify(query, detected_lang)

        intent = classification["intent"]
        confidence = classification["confidence"]

        # Step 3: Booking lookup for check_booking with provided ID
        if intent == "check_booking" and booking_id and db:
            try:
                response_text = await self._lookup_booking(
                    booking_id, detected_lang, db
                )
                return ChatbotResponse(
                    response_text=response_text,
                    detected_language=detected_lang,
                    intent=intent,
                    suggested_actions=["View QR code", "Check boarding window"],
                    confidence=confidence,
                )
            except Exception:
                # Fall through to template response on lookup failure
                pass

        # Step 4: Build response from templates
        if intent == "fallback":
            response_text = FALLBACK_RESPONSES.get(
                detected_lang, FALLBACK_RESPONSES["en"]
            )
        else:
            response_text = INTENT_RESPONSES.get(intent, {}).get(
                detected_lang,
                INTENT_RESPONSES.get(intent, {}).get("en", ""),
            )

        return ChatbotResponse(
            response_text=response_text,
            detected_language=detected_lang,
            intent=intent,
            suggested_actions=self._get_suggestions(intent, detected_lang),
            confidence=confidence,
        )

    # ------------------------------------------------------------------
    # Internal — language detection
    # ------------------------------------------------------------------

    @staticmethod
    def _detect_language(query: str) -> str:
        """Detect the language of a query using langdetect.

        Falls back to English if detection fails or language is unsupported.
        """
        try:
            lang = detect_language(query)
            lang_map = {
                "tl": "fil",  # Tagalog → Filipino
                "id": "id",
                "vi": "vi",
                "en": "en",
                "ms": "id",  # Malay → Indonesian (closest match)
            }
            return lang_map.get(lang, "en")
        except Exception:
            return "en"

    # ------------------------------------------------------------------
    # Internal — keyword fallback classifier
    # ------------------------------------------------------------------

    @staticmethod
    def _classify_intent_fallback(query: str, language: str) -> tuple[str, float]:
        """Classify intent via keyword matching (fallback when model unavailable).

        Returns (intent, confidence) tuple.
        """
        query_lower = query.lower().strip()
        keywords = INTENT_KEYWORDS.get(language, INTENT_KEYWORDS["en"])

        best_intent = "fallback"
        best_score = 0.0

        for intent, words in keywords.items():
            score = sum(1 for w in words if w in query_lower)
            normalized = score / max(len(words), 1)
            if normalized > best_score:
                best_score = normalized
                best_intent = intent

        confidence = min(0.9, best_score * 3.0)
        return best_intent, round(confidence, 2)

    # ------------------------------------------------------------------
    # Internal — booking lookup
    # ------------------------------------------------------------------

    async def _lookup_booking(
        self, booking_id: UUID, language: str, db: AsyncSession
    ) -> str:
        """Look up a booking and return a status message in the user's language."""
        result = await db.execute(
            select(Booking).where(Booking.id == booking_id)
        )
        booking = result.scalars().first()

        if not booking:
            templates = {
                "en": "I couldn't find a booking with that ID. Please double-check and try again.",
                "fil": "Hindi ko mahanap ang booking na may ID na iyan. Pakitingnan muli at subukan ulit.",
                "id": "Saya tidak dapat menemukan pemesanan dengan ID tersebut. Silakan periksa kembali dan coba lagi.",
                "vi": "Tôi không tìm thấy đặt vé với mã đó. Vui lòng kiểm tra lại và thử lại.",
            }
            return templates.get(language, templates["en"])

        status_map_en = {
            BookingStatus.CONFIRMED: "confirmed",
            BookingStatus.PENDING: "pending",
            BookingStatus.BOARDED: "boarded",
            BookingStatus.CANCELLED: "cancelled",
            BookingStatus.MISSED: "missed",
        }

        status_text = status_map_en.get(booking.status, "unknown")
        templates = {
            "en": f"Your booking is {status_text}. Seat: {booking.seat_number}. Boarding window: {booking.boarding_window_start.strftime('%H:%M')} → {booking.boarding_window_end.strftime('%H:%M')}.",
            "fil": f"Ang iyong booking ay {status_text}. Upuan: {booking.seat_number}. Oras ng pagsakay: {booking.boarding_window_start.strftime('%H:%M')} → {booking.boarding_window_end.strftime('%H:%M')}.",
        }
        return templates.get(language, templates["en"])

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
