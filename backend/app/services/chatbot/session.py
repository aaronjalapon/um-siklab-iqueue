"""Conversation session manager for multi-turn chatbot interactions.

Tracks ChatSession → ChatMessage chains, accumulates extracted entities
across messages, and provides context to downstream intent classification
and response generation.
"""

from __future__ import annotations

import logging
import re
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat_session import ChatMessage, ChatSession

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Entity extraction patterns
# ---------------------------------------------------------------------------

# Known Philippine inter-city route origins/destinations
_ROUTE_CITIES = [
    "davao", "davao city", "cagayan", "cagayan de oro", "cotabato",
    "general santos", "iligan", "butuan", "zamboanga", "manila",
    "quezon city", "cebu", "bacolod", "iloilo", "tacloban",
    "pagadian", "surigao", "dipolog", "ozamiz", "valencia",
    "malaybalay", "kidapawan", "digos", "tagum", "panabo",
    "mati", "samal", "makati", "pasay", "taguig", "marikina",
]

_PHONE_RE = re.compile(
    r"(\+63\d{10}|0\d{10}|09\d{2}[-\s]?\d{3}[-\s]?\d{4}|\d{3}[-\s]?\d{3}[-\s]?\d{4})"
)

_DATE_PATTERNS: list[tuple[re.Pattern, str]] = [
    # "June 10", "June 10, 2026"
    (re.compile(
        r"(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|"
        r"jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|"
        r"nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?"
        r"(?:,?\s*\d{4})?",
        re.IGNORECASE,
    ), "date"),
    # YYYY-MM-DD
    (re.compile(r"\d{4}-\d{2}-\d{2}"), "date"),
    # "today", "tomorrow", "next monday", "this weekend"
    (re.compile(
        r"\b(?:today|tomorrow|yesterday|"
        r"(?:this|next|last)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|"
        r"week(?:end)?|month))\b",
        re.IGNORECASE,
    ), "relative_date"),
]

# Negation words per language (lowercase)
_NEGATION_WORDS: dict[str, set[str]] = {
    "en": {"no", "not", "never", "don't", "do not", "doesn't", "does not",
           "isn't", "is not", "can't", "cannot", "won't", "will not"},
    "fil": {"hindi", "huwag", "wag", "walang", "wala", "hindi po", "hindi na",
            "di", "nde", "hinde"},
    "id": {"tidak", "bukan", "jangan", "nggak", "gak", "tak", "bukanlah"},
    "vi": {"không", "chưa", "chẳng", "đừng", "không phải", "chả"},
}

# ---------------------------------------------------------------------------
# SessionManager
# ---------------------------------------------------------------------------


class SessionManager:
    """Manages chat session lifecycle and entity accumulation.

    Provides methods to create sessions, record messages, retrieve
    conversation history, and aggregate extracted entities across turns.
    """

    MAX_HISTORY = 20  # last N messages to return for context
    SESSION_TTL_HOURS = 24

    # ------------------------------------------------------------------
    # Session lifecycle
    # ------------------------------------------------------------------

    @staticmethod
    async def create_session(
        db: AsyncSession,
        language: str = "en",
        passenger_id: uuid.UUID | None = None,
    ) -> ChatSession:
        """Create a new chat session and return it."""
        session = ChatSession(
            language=language,
            passenger_id=passenger_id,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=SessionManager.SESSION_TTL_HOURS),
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        logger.debug("Created chat session %s (lang=%s)", session.id, language)
        return session

    @staticmethod
    async def get_session(
        db: AsyncSession, session_id: uuid.UUID
    ) -> ChatSession | None:
        """Fetch a session by ID, returning None if expired or not found."""
        result = await db.execute(
            select(ChatSession).where(
                ChatSession.id == session_id,
                ChatSession.expires_at > datetime.now(timezone.utc),
            )
        )
        return result.scalars().first()

    # ------------------------------------------------------------------
    # Message management
    # ------------------------------------------------------------------

    @staticmethod
    async def add_message(
        db: AsyncSession,
        session_id: uuid.UUID,
        role: str,
        content: str,
        intent: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> ChatMessage:
        """Record a message in a session and return it."""
        msg = ChatMessage(
            session_id=session_id,
            role=role,
            content=content,
            intent=intent,
            metadata_=metadata,
        )
        db.add(msg)
        await db.commit()
        await db.refresh(msg)
        return msg

    @staticmethod
    async def get_history(
        db: AsyncSession,
        session_id: uuid.UUID,
        limit: int = MAX_HISTORY,
    ) -> list[ChatMessage]:
        """Return the most recent N messages in a session."""
        result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
        )
        # Reverse to chronological order
        return list(reversed(result.scalars().all()))

    # ------------------------------------------------------------------
    # Context accumulation
    # ------------------------------------------------------------------

    @staticmethod
    async def get_context(db: AsyncSession, session_id: uuid.UUID) -> dict[str, Any]:
        """Aggregate extracted entities across all messages in a session.

        Returns a dict with accumulated context like:
            {origin, destination, date, passenger_id, booking_id,
             phone, flow, flow_step, preferred_route_id, ...}
        """
        messages = await SessionManager.get_history(db, session_id)
        context: dict[str, Any] = {}

        for msg in messages:
            if msg.metadata_:
                for key, value in msg.metadata_.items():
                    if value is not None:
                        # Later messages override earlier ones for scalar values
                        if key in context and isinstance(value, list):
                            context.setdefault(key, []).extend(value)
                        elif key in context and isinstance(context[key], dict):
                            context[key].update(value)
                        else:
                            context[key] = value

        return context

    # ------------------------------------------------------------------
    # Entity extraction
    # ------------------------------------------------------------------

    @staticmethod
    def extract_entities(text: str, intent: str) -> dict[str, Any]:
        """Extract structured entities from a user query.

        Returns dict with any of: origin, destination, date, phone,
        booking_id, route_cities, negation.
        """
        entities: dict[str, Any] = {}
        text_lower = text.lower().strip()

        # --- Route cities ---
        # Find all route cities present in the text, sorted by their
        # position in the text (not in the _ROUTE_CITIES list).
        found_cities_with_pos: list[tuple[int, str]] = []
        for city in _ROUTE_CITIES:
            pos = text_lower.find(city)
            if pos >= 0:
                found_cities_with_pos.append((pos, city))
        found_cities_with_pos.sort(key=lambda x: x[0])
        found_cities = [c for _, c in found_cities_with_pos]

        if found_cities:
            entities["route_cities"] = found_cities
            # Heuristic: first city mentioned is origin, last is destination
            if len(found_cities) >= 2:
                entities["origin"] = found_cities[0]
                entities["destination"] = found_cities[-1]

        # --- Phone numbers ---
        phone_match = _PHONE_RE.search(text)
        if phone_match:
            raw_phone = phone_match.group(0).replace("-", "").replace(" ", "")
            # Normalize to 0-format
            if raw_phone.startswith("+63"):
                raw_phone = "0" + raw_phone[3:]
            entities["phone"] = raw_phone

        # --- Dates ---
        for pattern, date_type in _DATE_PATTERNS:
            match = pattern.search(text)
            if match:
                entities["date_text"] = match.group(0)
                entities["date_type"] = date_type
                # Try to parse to an actual date
                parsed = SessionManager._parse_date(match.group(0))
                if parsed:
                    entities["date"] = parsed.isoformat()
                break

        # --- Booking ID (UUID pattern) ---
        uuid_match = re.search(
            r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
            text, re.IGNORECASE,
        )
        if uuid_match:
            entities["booking_id"] = uuid_match.group(0)

        # --- Negation detection ---
        entities["has_negation"] = SessionManager._detect_negation(text_lower)

        return entities

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_date(text: str) -> date | None:
        """Attempt to parse a date string into a date object."""
        today = date.today()

        # Relative dates
        rel = text.lower().strip()
        if rel == "today":
            return today
        if rel == "tomorrow":
            return today + timedelta(days=1)
        if rel == "yesterday":
            return today - timedelta(days=1)

        # Day-of-week relative
        days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        for offset_prefix, offset in [("next ", 7), ("this ", 0), ("last ", -7)]:
            for i, day_name in enumerate(days):
                if rel == f"{offset_prefix}{day_name}" or rel == f"{offset_prefix}{day_name[:3]}":
                    target = today + timedelta(days=offset + (i - today.weekday()))
                    return target

        if rel in ("this weekend", "this week"):
            # Next Saturday
            days_until_sat = (5 - today.weekday()) % 7
            return today + timedelta(days=days_until_sat)

        # "Month Day" format (e.g., "june 10", "jun 10, 2026")
        months = {
            "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
            "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
        }
        for abbr, month_num in months.items():
            m = re.match(rf"{abbr}\w*\s+(\d{{1,2}})", rel)
            if m:
                day = int(m.group(1))
                year = today.year
                # If the date is already past this year, assume next year
                try:
                    parsed = date(year, month_num, day)
                    if parsed < today - timedelta(days=1):
                        parsed = date(year + 1, month_num, day)
                    return parsed
                except ValueError:
                    return None

        # ISO format
        try:
            return date.fromisoformat(text.strip())
        except (ValueError, TypeError):
            pass

        return None

    @staticmethod
    def _detect_negation(text_lower: str) -> bool:
        """Detect if the text contains a negation signal.

        Checks across all supported languages. Returns True if negation found.
        """
        words = set(text_lower.split())
        for lang_negations in _NEGATION_WORDS.values():
            # Check single-word negations
            if words & lang_negations:
                return True
            # Check multi-word negations
            for neg in lang_negations:
                if " " in neg and neg in text_lower:
                    return True
        return False

    # ------------------------------------------------------------------
    # Maintenance
    # ------------------------------------------------------------------

    @staticmethod
    async def expire_old_sessions(db: AsyncSession) -> int:
        """Delete sessions that have passed their expiry.

        Returns the count of deleted sessions.
        """
        result = await db.execute(
            delete(ChatSession).where(
                ChatSession.expires_at <= datetime.now(timezone.utc)
            )
        )
        await db.commit()
        deleted = result.rowcount
        if deleted:
            logger.info("Expired %d chat sessions", deleted)
        return deleted

    # ------------------------------------------------------------------
    # Language helpers
    # ------------------------------------------------------------------

    @staticmethod
    async def detect_language_with_confidence(query: str) -> tuple[str, float]:
        """Detect language with confidence score.

        Uses the same hybrid heuristic + langdetect approach as the
        ChatbotService, but returns a confidence value alongside.
        """
        from app.services.chatbot.bot import ChatbotService

        # _detect_language is a static method — call it directly
        # It now returns (language, confidence) tuple
        lang, base_confidence = ChatbotService._detect_language(query)

        # The base confidence from _detect_language is already computed,
        # but we may refine it here based on additional heuristics
        return lang, base_confidence
