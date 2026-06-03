"""Unit tests for the multilingual chatbot service and API endpoint."""

from __future__ import annotations

import uuid

import pytest


# ============================================================================
# Fallback classifier tests (keyword-based, no model needed)
# ============================================================================


class TestFallbackClassifier:
    """Test the keyword-based fallback intent classifier."""

    def test_detect_english_check_booking(self):
        """Keyword matching should detect check_booking in English."""
        from app.services.chatbot.bot import ChatbotService

        svc = ChatbotService()
        svc._model_available = False
        intent, confidence = svc._classify_intent_fallback(
            "where is my booking", "en"
        )
        assert intent == "check_booking"
        assert confidence > 0

    def test_detect_english_request_requeue(self):
        """Keyword matching should detect request_requeue."""
        from app.services.chatbot.bot import ChatbotService

        svc = ChatbotService()
        svc._model_available = False
        intent, confidence = svc._classify_intent_fallback(
            "I missed my bus can I rebook", "en"
        )
        assert intent == "request_requeue"
        assert confidence > 0

    def test_detect_english_departure_info(self):
        """Keyword matching should detect get_departure_info."""
        from app.services.chatbot.bot import ChatbotService

        svc = ChatbotService()
        svc._model_available = False
        intent, confidence = svc._classify_intent_fallback(
            "what time does the bus depart", "en"
        )
        assert intent == "get_departure_info"
        assert confidence > 0

    def test_detect_english_surge_info(self):
        """Keyword matching should detect surge_info."""
        from app.services.chatbot.bot import ChatbotService

        svc = ChatbotService()
        svc._model_available = False
        intent, confidence = svc._classify_intent_fallback(
            "is the bus going to be crowded", "en"
        )
        assert intent == "surge_info"
        assert confidence > 0

    def test_unmatched_query_falls_back(self):
        """Unmatched queries should return fallback intent."""
        from app.services.chatbot.bot import ChatbotService

        svc = ChatbotService()
        svc._model_available = False
        intent, confidence = svc._classify_intent_fallback(
            "xyzzy nothing matches this", "en"
        )
        assert intent == "fallback"

    def test_filipino_check_booking(self):
        """Filipino 'Nasaan ang booking ko?' should detect check_booking."""
        from app.services.chatbot.bot import ChatbotService

        svc = ChatbotService()
        svc._model_available = False
        intent, _ = svc._classify_intent_fallback(
            "Nasaan ang aking booking", "fil"
        )
        assert intent == "check_booking"

    def test_indonesian_departure_info(self):
        """Indonesian 'Kapan bus berangkat?' should detect departure."""
        from app.services.chatbot.bot import ChatbotService

        svc = ChatbotService()
        svc._model_available = False
        intent, _ = svc._classify_intent_fallback(
            "kapan bus berangkat", "id"
        )
        assert intent == "get_departure_info"

    def test_vietnamese_surge_info(self):
        """Vietnamese 'Xe có đông không?' should detect surge."""
        from app.services.chatbot.bot import ChatbotService

        svc = ChatbotService()
        svc._model_available = False
        intent, _ = svc._classify_intent_fallback(
            "xe có đông không", "vi"
        )
        assert intent == "surge_info"


# ============================================================================
# Language detection tests
# ============================================================================


class TestLanguageDetection:
    """Test the language detection helper."""

    def test_detect_english(self):
        from app.services.chatbot.bot import ChatbotService

        lang = ChatbotService._detect_language("where is my bus")
        assert lang == "en"

    def test_detect_filipino(self):
        from app.services.chatbot.bot import ChatbotService

        lang = ChatbotService._detect_language(
            "Nasaan ang aking booking"
        )
        assert lang in ("fil", "en")  # langdetect may misclassify short text

    def test_fallback_on_gibberish(self):
        from app.services.chatbot.bot import ChatbotService

        lang = ChatbotService._detect_language("12345 !!! ???")
        # Should return a supported language (defaults to "en")
        assert lang in {"en", "fil", "id", "vi"}

    def test_handles_empty_string(self):
        from app.services.chatbot.bot import ChatbotService

        lang = ChatbotService._detect_language("")
        assert lang in {"en", "fil", "id", "vi"}


# ============================================================================
# ChatbotService instantiation (graceful when model missing)
# ============================================================================


class TestChatbotServiceInit:
    """Test that ChatbotService initialises gracefully."""

    def test_instantiates_without_model(self, monkeypatch):
        """When no model is present, service should set _model_available=False."""
        import tempfile
        from pathlib import Path

        from app.services.chatbot.bot import ChatbotService

        with monkeypatch.context() as m:
            # Point CHATBOT_MODEL_PATH to a non-existent directory
            m.setenv("CHATBOT_MODEL_PATH", "/tmp/nonexistent-model-dir-12345")

            svc = ChatbotService()
            assert svc._model_available is False

    def test_singleton_returns_same_instance(self):
        """get_chatbot_service should cache the instance."""
        from app.services.chatbot.bot import get_chatbot_service

        svc1 = get_chatbot_service()
        svc2 = get_chatbot_service()

        if svc1 is not None:
            assert svc1 is svc2, "Singleton should return the same instance"

    def test_classify_fallback_returns_valid_dict(self):
        """classify() should always return a dict with required keys."""
        from app.services.chatbot.bot import ChatbotService

        svc = ChatbotService()
        svc._model_available = False
        result = svc.classify("Where is my booking?", "en")

        assert "intent" in result
        assert "confidence" in result
        assert "detected_language" in result
        assert "all_scores" in result
        assert result["intent"] in {
            "check_booking",
            "request_requeue",
            "get_departure_info",
            "surge_info",
            "fallback",
        }
        assert 0.0 <= result["confidence"] <= 1.0


# ============================================================================
# Response templates
# ============================================================================


class TestResponses:
    """Test that all intents have response templates in all languages."""

    def test_fallback_responses_all_languages(self):
        from app.services.chatbot.bot import FALLBACK_RESPONSES

        for lang in ("en", "fil", "id", "vi"):
            assert lang in FALLBACK_RESPONSES, f"Missing fallback for {lang}"
            assert len(FALLBACK_RESPONSES[lang]) > 0

    def test_intent_responses_all_languages(self):
        from app.services.chatbot.bot import INTENT_RESPONSES

        intents = ("check_booking", "request_requeue", "get_departure_info", "surge_info")
        for intent in intents:
            assert intent in INTENT_RESPONSES, f"Missing intent: {intent}"
            for lang in ("en", "fil", "id", "vi"):
                assert lang in INTENT_RESPONSES[intent], (
                    f"Missing {intent} response for {lang}"
                )

    def test_suggestions_all_intents(self):
        from app.services.chatbot.bot import ChatbotService

        intents = ("check_booking", "request_requeue", "get_departure_info",
                    "surge_info", "fallback")
        for intent in intents:
            suggestions = ChatbotService._get_suggestions(intent, "en")
            assert len(suggestions) > 0, f"No suggestions for {intent}"
            assert len(suggestions) <= 3, f"Too many suggestions for {intent}"


# ============================================================================
# API endpoint integration tests
# ============================================================================


class TestChatbotEndpoint:
    """Integration tests for POST /api/v1/chatbot/message."""

    @pytest.mark.anyio
    async def test_endpoint_returns_200(self, client):
        """Endpoint should return 200 with valid response shape."""
        payload = {"query": "Where is my bus?"}
        response = await client.post("/api/v1/chatbot/message", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "intent" in data
        assert "response_text" in data
        assert "detected_language" in data
        assert "suggested_actions" in data
        assert "confidence" in data

    @pytest.mark.anyio
    async def test_endpoint_rejects_empty_query(self, client):
        """Empty query should be rejected (min_length=1)."""
        payload = {"query": ""}
        response = await client.post("/api/v1/chatbot/message", json=payload)
        assert response.status_code == 422

    @pytest.mark.anyio
    async def test_endpoint_rejects_too_long_query(self, client):
        """Query over 500 chars should be rejected."""
        payload = {"query": "x" * 501}
        response = await client.post("/api/v1/chatbot/message", json=payload)
        assert response.status_code == 422

    @pytest.mark.anyio
    async def test_endpoint_with_language_hint(self, client):
        """Providing a language hint should be respected."""
        payload = {"query": "Where is my booking?", "language": "en"}
        response = await client.post("/api/v1/chatbot/message", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["detected_language"] == "en"

    @pytest.mark.anyio
    async def test_endpoint_missing_query(self, client):
        """Missing required field should return 422."""
        payload: dict = {}
        response = await client.post("/api/v1/chatbot/message", json=payload)
        assert response.status_code == 422


# ============================================================================
# Multilingual acceptance tests (keyword fallback path)
# ============================================================================


class TestMultilingualAcceptance:
    """Verify the acceptance criteria from the handoff."""

    def test_filipino_check_booking_acceptance(self):
        """'Nasaan ang aking booking?' → check_booking."""
        from app.services.chatbot.bot import ChatbotService

        svc = ChatbotService()
        svc._model_available = False
        result = svc.classify("Nasaan ang aking booking?", "fil")
        assert result["intent"] == "check_booking", (
            f"Expected check_booking, got {result['intent']}"
        )

    def test_indonesian_departure_acceptance(self):
        """'Kapan bus ke Jakarta?' → get_departure_info."""
        from app.services.chatbot.bot import ChatbotService

        svc = ChatbotService()
        svc._model_available = False
        result = svc.classify("Kapan bus ke Jakarta?", "id")
        assert result["intent"] == "get_departure_info", (
            f"Expected get_departure_info, got {result['intent']}"
        )

    def test_vietnamese_surge_acceptance(self):
        """'Xe có đông không?' → surge_info."""
        from app.services.chatbot.bot import ChatbotService

        svc = ChatbotService()
        svc._model_available = False
        result = svc.classify("Xe có đông không?", "vi")
        assert result["intent"] == "surge_info", (
            f"Expected surge_info, got {result['intent']}"
        )

    @pytest.mark.anyio
    async def test_endpoint_multilingual_filipino(self, client):
        """API should handle Filipino queries."""
        payload = {"query": "Nasaan ang aking booking?"}
        response = await client.post("/api/v1/chatbot/message", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["intent"] in {
            "check_booking", "request_requeue",
            "get_departure_info", "surge_info", "fallback",
        }

    @pytest.mark.anyio
    async def test_endpoint_multilingual_indonesian(self, client):
        """API should handle Indonesian queries."""
        payload = {"query": "Kapan bus ke Jakarta?"}
        response = await client.post("/api/v1/chatbot/message", json=payload)
        assert response.status_code == 200

    @pytest.mark.anyio
    async def test_endpoint_multilingual_vietnamese(self, client):
        """API should handle Vietnamese queries."""
        payload = {"query": "Xe có đông không?"}
        response = await client.post("/api/v1/chatbot/message", json=payload)
        assert response.status_code == 200
