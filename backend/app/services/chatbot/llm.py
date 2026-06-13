"""LLM-powered response generation for IQueue chatbot.

Uses the DeepSeek API to generate contextual, personalised responses for
complex intents (check_booking, request_requeue, fallback). Simple intents
(surge_info, departure_info) continue to use data-filled templates.

Falls back gracefully when the API is unavailable.
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# System prompts per language
# ---------------------------------------------------------------------------

SYSTEM_PROMPTS: dict[str, str] = {
    "en": (
        "You are the IQueue assistant, a helpful AI chatbot for an inter-provincial "
        "bus terminal booking platform in the ASEAN region. "
        "You speak warmly and professionally. Keep responses concise (2-4 sentences). "
        "You help passengers check bookings, find departures, rebook missed buses, "
        "and understand surge crowd levels. "
        "Always respond in English. Never make up booking details."
    ),
    "fil": (
        "Ikaw ang IQueue assistant, isang AI chatbot para sa inter-provincial bus "
        "terminal booking platform sa ASEAN. "
        "Magsalita nang magiliw at propesyonal. Panatilihing maikli ang sagot (2-4 na pangungusap). "
        "Tumutulong ka sa pagtingin ng booking, paghahanap ng alis, pag-rebook, "
        "at pag-unawa sa crowd surge levels. "
        "Laging sumagot sa Filipino/Tagalog. Huwag gumawa ng maling detalye ng booking."
    ),
    "id": (
        "Anda adalah asisten IQueue, chatbot AI yang membantu untuk platform pemesanan "
        "terminal bus antar-provinsi di kawasan ASEAN. "
        "Berbicaralah dengan ramah dan profesional. Jaga respons tetap singkat (2-4 kalimat). "
        "Anda membantu penumpang memeriksa pemesanan, mencari keberangkatan, memesan ulang, "
        "dan memahami tingkat keramaian. "
        "Selalu jawab dalam Bahasa Indonesia. Jangan mengarang detail pemesanan."
    ),
    "vi": (
        "Bạn là trợ lý IQueue, chatbot AI cho nền tảng đặt vé xe buýt liên tỉnh "
        "tại khu vực ASEAN. "
        "Nói chuyện ấm áp và chuyên nghiệp. Giữ câu trả lời ngắn gọn (2-4 câu). "
        "Bạn giúp hành khách kiểm tra đặt vé, tìm chuyến khởi hành, đặt lại vé, "
        "và hiểu mức độ đông đúc. "
        "Luôn trả lời bằng tiếng Việt. Đừng bịa ra chi tiết đặt vé."
    ),
}

# ---------------------------------------------------------------------------
# Intent-specific instruction suffix
# ---------------------------------------------------------------------------

INTENT_INSTRUCTIONS: dict[str, str] = {
    "check_booking": (
        "The user is asking about their booking. Use the provided booking data "
        "to give a clear, helpful response. Mention the booking status, seat number, "
        "route, and departure info."
    ),
    "request_requeue": (
        "The user wants to rebook after missing their bus. Be empathetic. "
        "Guide them through the rebooking process based on the provided data."
    ),
    "fallback": (
        "The user's intent is unclear. Politely ask them to clarify, and suggest "
        "the types of things you can help with: bookings, departures, rebooking, "
        "and crowd levels."
    ),
}

MAX_RESPONSE_CHARS = 500


# ============================================================================
# LLMResponder
# ============================================================================


class LLMResponder:
    """Generates responses via DeepSeek API for complex chatbot intents.

    Simple intents (surge_info, departure_info) should continue using
    the template path — this is for check_booking (with real data),
    request_requeue (multi-turn flow), and fallback (clarification).
    """

    @staticmethod
    async def generate_response(
        intent: str,
        response_data: dict[str, Any],
        language: str = "en",
        session_context: dict[str, Any] | None = None,
        query: str = "",
    ) -> str | None:
        """Generate a contextual response using DeepSeek.

        Args:
            intent: The classified intent.
            response_data: Contains template_response and any real data.
            language: ISO 639-1 language code.
            session_context: Aggregated session entities.
            query: The user's original query.

        Returns:
            Generated response text, or None if LLM is unavailable.
        """
        api_key = os.getenv("DEEPSEEK_API_KEY")
        if not api_key:
            logger.debug("DEEPSEEK_API_KEY not set — skipping LLM enhancement")
            return None

        # Build the prompt
        system_prompt = SYSTEM_PROMPTS.get(language, SYSTEM_PROMPTS["en"])
        intent_instruction = INTENT_INSTRUCTIONS.get(intent, "")

        # Build user prompt with context
        user_prompt_parts = [f"User query: {query}"]

        template_response = response_data.get("template_response", "")
        if template_response:
            user_prompt_parts.append(f"Template fallback: {template_response}")

        if session_context:
            ctx_str = json.dumps({
                k: v for k, v in session_context.items()
                if k not in ("all_scores", "_internal")
            }, default=str)
            user_prompt_parts.append(f"Session context: {ctx_str}")

        user_prompt_parts.append(
            "Generate a helpful, natural response in the correct language. "
            "Do NOT mention that you are an AI. Keep it brief."
        )
        user_prompt = "\n".join(user_prompt_parts)

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    "https://api.deepseek.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "deepseek-chat",
                        "messages": [
                            {"role": "system", "content": f"{system_prompt}\n\n{intent_instruction}"},
                            {"role": "user", "content": user_prompt},
                        ],
                        "max_tokens": 200,
                        "temperature": 0.7,
                    },
                )
                response.raise_for_status()
                data = response.json()
                text = data["choices"][0]["message"]["content"].strip()

                # Remove any markdown code fences
                text = re.sub(r"^```[a-z]*\s*", "", text)
                text = re.sub(r"\s*```$", "", text)

                # Truncate to max length
                if len(text) > MAX_RESPONSE_CHARS:
                    text = text[:MAX_RESPONSE_CHARS - 3] + "…"

                logger.debug("LLM generated response (%d chars) for intent=%s", len(text), intent)
                return text

        except httpx.TimeoutException:
            logger.warning("DeepSeek API timeout — using template fallback")
            return None
        except httpx.HTTPStatusError as exc:
            logger.warning("DeepSeek API error %d: %s", exc.response.status_code, exc)
            return None
        except Exception as exc:
            logger.warning("DeepSeek API call failed: %s", exc)
            return None
