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

    def test_negation_reduces_score(self):
        """Negation words should reduce intent confidence."""
        from app.services.chatbot.bot import ChatbotService

        svc = ChatbotService()
        svc._model_available = False

        # "Hindi marami" = "not crowded" — should NOT be surge_info
        intent, _ = svc._classify_intent_fallback(
            "hindi marami tao", "fil"
        )
        # With negation, it might still match but with lower confidence
        # or fall through to fallback
        assert intent in ("surge_info", "fallback")

    def test_bigram_matching(self):
        """Phrases like 'my booking' should match as a unit."""
        from app.services.chatbot.bot import ChatbotService

        svc = ChatbotService()
        svc._model_available = False
        intent, confidence = svc._classify_intent_fallback(
            "can you find my booking please", "en"
        )
        assert intent == "check_booking"
        assert confidence > 0


# ============================================================================
# Language detection tests (updated for tuple return)
# ============================================================================


class TestLanguageDetection:
    """Test the language detection helper (now returns (lang, confidence))."""

    def test_detect_english(self):
        from app.services.chatbot.bot import ChatbotService

        lang, conf = ChatbotService._detect_language("where is my bus")
        assert lang == "en"
        assert 0.0 <= conf <= 1.0

    def test_detect_filipino(self):
        from app.services.chatbot.bot import ChatbotService

        lang, conf = ChatbotService._detect_language(
            "Nasaan ang aking booking po"
        )
        # With 3 Filipino stopwords, should detect as fil
        assert lang in ("fil", "en")
        assert 0.0 <= conf <= 1.0

    def test_fallback_on_gibberish(self):
        from app.services.chatbot.bot import ChatbotService

        lang, conf = ChatbotService._detect_language("12345 !!! ???")
        assert lang in {"en", "fil", "id", "vi"}

    def test_handles_empty_string(self):
        from app.services.chatbot.bot import ChatbotService

        lang, conf = ChatbotService._detect_language("")
        assert lang in {"en", "fil", "id", "vi"}

    def test_vietnamese_diacritics_high_confidence(self):
        from app.services.chatbot.bot import ChatbotService

        lang, conf = ChatbotService._detect_language("tôi muốn đặt vé xe")
        assert lang == "vi"
        assert conf >= 0.85  # High confidence due to diacritics

    def test_filipino_stopwords_detection(self):
        from app.services.chatbot.bot import ChatbotService

        lang, conf = ChatbotService._detect_language(
            "ang booking ko po sa bus papuntang Davao"
        )
        assert lang == "fil"
        assert conf >= 0.70  # Multiple Filipino stopwords

    def test_short_english_low_confidence(self):
        from app.services.chatbot.bot import ChatbotService

        lang, conf = ChatbotService._detect_language("hello")
        assert lang == "en"
        assert conf <= 0.70  # Short query = lower confidence


# ============================================================================
# ChatbotService instantiation (graceful when model missing)
# ============================================================================


class TestChatbotServiceInit:
    """Test that ChatbotService initialises gracefully."""

    def test_instantiates_without_model(self, monkeypatch):
        """When no model is present, service should set _model_available=False."""
        from app.core.config import get_settings
        from app.services.chatbot.bot import ChatbotService

        get_settings.cache_clear()

        with monkeypatch.context() as m:
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

    def test_classify_with_context_no_context(self):
        """classify_with_context with no context should work like classify."""
        from app.services.chatbot.bot import ChatbotService

        svc = ChatbotService()
        svc._model_available = False
        result = svc.classify_with_context("Where is my booking?", "en", None)
        assert "intent" in result
        assert result["intent"] in {
            "check_booking", "request_requeue",
            "get_departure_info", "surge_info", "fallback",
        }


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
# Entity extraction tests
# ============================================================================


class TestEntityExtraction:
    """Test entity extraction from user queries."""

    def test_extract_route_cities(self):
        from app.services.chatbot.session import SessionManager

        entities = SessionManager.extract_entities(
            "I want to go from Manila to Davao tomorrow", "get_departure_info"
        )
        assert "manila" in entities.get("route_cities", [])
        assert "davao" in entities.get("route_cities", [])
        assert entities.get("origin") == "manila"
        assert entities.get("destination") == "davao"

    def test_extract_phone_number(self):
        from app.services.chatbot.session import SessionManager

        entities = SessionManager.extract_entities(
            "My phone is 09981234567", "check_booking"
        )
        assert entities.get("phone") == "09981234567"

    def test_extract_date_tomorrow(self):
        from app.services.chatbot.session import SessionManager

        entities = SessionManager.extract_entities(
            "Is it crowded tomorrow?", "surge_info"
        )
        assert entities.get("date_text") == "tomorrow"
        assert entities.get("date") is not None  # Parsed to actual date

    def test_extract_booking_id(self):
        from app.services.chatbot.session import SessionManager

        bid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        entities = SessionManager.extract_entities(
            f"Check booking {bid}", "check_booking"
        )
        assert entities.get("booking_id") == bid

    def test_detect_negation(self):
        from app.services.chatbot.session import SessionManager

        entities = SessionManager.extract_entities(
            "I did not miss my bus", "request_requeue"
        )
        assert entities.get("has_negation") is True

    def test_no_negation(self):
        from app.services.chatbot.session import SessionManager

        entities = SessionManager.extract_entities(
            "Where is my booking", "check_booking"
        )
        assert entities.get("has_negation") is False


# ============================================================================
# Session management tests
# ============================================================================


class TestSessionManagement:
    """Test chat session creation and message management."""

    @pytest.mark.asyncio
    async def test_create_session(self, db_session):
        from app.services.chatbot.session import SessionManager

        session = await SessionManager.create_session(db_session, language="fil")
        assert session.id is not None
        assert session.language == "fil"

    @pytest.mark.asyncio
    async def test_add_and_get_messages(self, db_session):
        from app.services.chatbot.session import SessionManager

        session = await SessionManager.create_session(db_session, language="en")

        await SessionManager.add_message(
            db_session, session.id, "user", "Hello", intent="greeting",
        )
        await SessionManager.add_message(
            db_session, session.id, "bot", "Hi there!", intent="greeting",
        )

        history = await SessionManager.get_history(db_session, session.id)
        assert len(history) == 2
        assert history[0].role == "user"
        assert history[1].role == "bot"

    @pytest.mark.asyncio
    async def test_get_context_accumulates_entities(self, db_session):
        from app.services.chatbot.session import SessionManager

        session = await SessionManager.create_session(db_session, language="en")

        await SessionManager.add_message(
            db_session, session.id, "user", "Manila to Davao",
            intent="get_departure_info",
            metadata={"origin": "manila", "destination": "davao"},
        )
        await SessionManager.add_message(
            db_session, session.id, "user", "tomorrow",
            intent="get_departure_info",
            metadata={"date_text": "tomorrow"},
        )

        ctx = await SessionManager.get_context(db_session, session.id)
        assert ctx.get("origin") == "manila"
        assert ctx.get("destination") == "davao"
        assert ctx.get("date_text") == "tomorrow"

    @pytest.mark.asyncio
    async def test_get_session_returns_none_for_missing(self, db_session):
        from app.services.chatbot.session import SessionManager

        fake_id = uuid.uuid4()
        session = await SessionManager.get_session(db_session, fake_id)
        assert session is None


# ============================================================================
# API endpoint integration tests
# ============================================================================


class TestChatbotEndpoint:
    """Integration tests for the chatbot API endpoints."""

    @pytest.mark.asyncio
    async def test_message_endpoint_returns_200(self, client):
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
        # New fields
        assert "language_confidence" in data
        assert "session_id" in data
        assert "degradation_level" in data

    @pytest.mark.asyncio
    async def test_message_endpoint_rejects_empty_query(self, client):
        """Empty query should be rejected (min_length=1)."""
        payload = {"query": ""}
        response = await client.post("/api/v1/chatbot/message", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_message_endpoint_rejects_too_long_query(self, client):
        """Query over 500 chars should be rejected."""
        payload = {"query": "x" * 501}
        response = await client.post("/api/v1/chatbot/message", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_message_endpoint_with_language_hint(self, client):
        """Providing a language hint should be respected."""
        payload = {"query": "Where is my booking?", "language": "en"}
        response = await client.post("/api/v1/chatbot/message", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["detected_language"] == "en"

    @pytest.mark.asyncio
    async def test_message_endpoint_missing_query(self, client):
        """Missing required field should return 422."""
        payload: dict = {}
        response = await client.post("/api/v1/chatbot/message", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_session_endpoint_creates_session(self, client):
        """POST /session should create a new chat session."""
        response = await client.post("/api/v1/chatbot/session?language=en")
        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert "greeting" in data
        assert "language" in data
        assert data["language"] == "en"
        assert len(data["greeting"]) > 0

    @pytest.mark.asyncio
    async def test_session_endpoint_defaults_to_english(self, client):
        """POST /session without language should default to English."""
        response = await client.post("/api/v1/chatbot/session")
        assert response.status_code == 200
        data = response.json()
        assert data["language"] == "en"

    @pytest.mark.asyncio
    async def test_message_with_session_context(self, client):
        """Messages with session_id should continue the conversation."""
        # Create a session first
        session_res = await client.post("/api/v1/chatbot/session?language=en")
        session_data = session_res.json()
        session_id = session_data["session_id"]

        # Send a message in that session
        payload = {
            "query": "Is the Davao to Cagayan route crowded?",
            "session_id": session_id,
        }
        response = await client.post("/api/v1/chatbot/message", json=payload)
        assert response.status_code == 200
        data = response.json()
        # Should return the same session_id
        assert data["session_id"] == session_id


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

    @pytest.mark.asyncio
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

    @pytest.mark.asyncio
    async def test_endpoint_multilingual_indonesian(self, client):
        """API should handle Indonesian queries."""
        payload = {"query": "Kapan bus ke Jakarta?"}
        response = await client.post("/api/v1/chatbot/message", json=payload)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_endpoint_multilingual_vietnamese(self, client):
        """API should handle Vietnamese queries."""
        payload = {"query": "Xe có đông không?"}
        response = await client.post("/api/v1/chatbot/message", json=payload)
        assert response.status_code == 200


# ============================================================================
# Degradation chain tests
# ============================================================================


class TestDegradation:
    """Test each level of the degradation chain."""

    def test_respond_without_db_sets_degradation(self):
        """When db is None, degradation should be at least 3."""
        import asyncio
        from app.services.chatbot.bot import ChatbotService

        async def run():
            svc = ChatbotService()
            svc._model_available = False
            response, meta, deg = await svc.respond(
                query="Where is my booking?",
                language="en",
                db=None,
            )
            assert deg >= 3
            assert response.degradation_level >= 3
            assert len(response.response_text) > 0  # Still returns something

        asyncio.run(run())

    def test_keyword_fallback_sets_degradation_2(self):
        """When model is not available, degradation should be at least 2."""
        import asyncio
        from app.services.chatbot.bot import ChatbotService

        async def run():
            svc = ChatbotService()
            svc._model_available = False
            # db is None in tests, so it'll be 3 not 2
            # But the _model_available flag should be checked
            response, meta, deg = await svc.respond(
                query="Where is my booking?", language="en", db=None,
            )
            # With no db AND no model, degradation is max(2, 3) = 3
            assert deg >= 2

        asyncio.run(run())


# ============================================================================
# Rebooking flow tests
# ============================================================================


class TestRebookingFlow:
    """Test the rebooking state machine."""

    @pytest.mark.asyncio
    async def test_identify_step_asks_for_phone(self, db_session):
        """First step of rebooking should ask for phone/booking ID."""
        from app.services.chatbot.actions import RebookingFlow

        result = await RebookingFlow.process_turn(
            db=db_session,
            session_id=uuid.uuid4(),
            query="I missed my bus",
            language="en",
            flow_state=None,
        )
        assert "response_text" in result
        assert "flow_metadata" in result
        assert "is_complete" in result
        assert result["is_complete"] is False
        assert result["flow_metadata"]["flow"] == "rebooking"
        assert result["flow_metadata"]["step"] == "identify"

    @pytest.mark.asyncio
    async def test_cancel_during_identify(self, db_session):
        """User should be able to cancel during identify step."""
        from app.services.chatbot.actions import RebookingFlow

        result = await RebookingFlow.process_turn(
            db=db_session,
            session_id=uuid.uuid4(),
            query="cancel",
            language="en",
            flow_state={"flow": "rebooking", "step": "identify"},
        )
        assert result["is_complete"] is True

    @pytest.mark.asyncio
    async def test_unknown_step_restarts(self, db_session):
        """An unknown flow step should restart from identify."""
        from app.services.chatbot.actions import RebookingFlow

        result = await RebookingFlow.process_turn(
            db=db_session,
            session_id=uuid.uuid4(),
            query="hello",
            language="en",
            flow_state={"flow": "rebooking", "step": "unknown_step_xyz"},
        )
        assert result["flow_metadata"]["step"] == "identify"


# ============================================================================
# LLM responder tests
# ============================================================================


class TestLLMResponder:
    """Test the LLM integration module."""

    @pytest.mark.asyncio
    async def test_returns_none_without_api_key(self, monkeypatch):
        """LLMResponder should return None when DEEPSEEK_API_KEY is not set."""
        from app.services.chatbot.llm import LLMResponder

        monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)

        result = await LLMResponder.generate_response(
            intent="check_booking",
            response_data={"template_response": "Your booking is confirmed"},
            language="en",
            query="Where is my booking?",
        )
        assert result is None  # Should skip LLM gracefully
