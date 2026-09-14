"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { sendChatMessage, createChatSession } from "@/lib/api";
import { applyFrontendBrand, BRAND } from "@/lib/brand";
import type { ChatbotAction, ChatbotResponse } from "@/lib/types";
import { MessageCircle, Send, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Language config
// ---------------------------------------------------------------------------

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "fil", label: "Filipino", flag: "🇵🇭" },
  { code: "id", label: "Bahasa", flag: "🇮🇩" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
] as const;

type LanguageCode = (typeof LANGUAGES)[number]["code"];

const UI_STRINGS: Record<
  LanguageCode,
  { title: string; subtitle: string; placeholder: string; thinking: string; error: string }
> = {
  en: {
    title: BRAND.assistantName,
    subtitle: "AI-powered · 4 languages",
    placeholder: "Type your question...",
    thinking: "Thinking...",
    error: "Sorry, I'm having trouble connecting. Please try again later.",
  },
  fil: {
    title: BRAND.assistantName,
    subtitle: "AI-powered · 4 na wika",
    placeholder: "I-type ang iyong tanong...",
    thinking: "Nag-iisip...",
    error: "Paumanhin, may problema sa koneksyon. Pakisubukan muli.",
  },
  id: {
    title: `Asisten ${BRAND.name}`,
    subtitle: "Chatbot AI · 4 bahasa",
    placeholder: "Ketik pertanyaan Anda...",
    thinking: "Berpikir...",
    error: "Maaf, saya mengalami masalah koneksi. Silakan coba lagi nanti.",
  },
  vi: {
    title: `Trợ lý ${BRAND.name}`,
    subtitle: "Chatbot AI · 4 ngôn ngữ",
    placeholder: "Nhập câu hỏi của bạn...",
    thinking: "Đang suy nghĩ...",
    error: "Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau.",
  },
};

const QUICK_REPLIES: Record<LanguageCode, string[]> = {
  en: ["Check my booking", "Is it crowded?", "When does my bus leave?", "I missed my bus"],
  fil: ["Tingnan booking", "Marami bang tao?", "Kailan alis?", "Naiwan ng bus"],
  id: ["Cek pesanan", "Apakah ramai?", "Kapan berangkat?", "Ketinggalan bus"],
  vi: ["Kiểm tra vé", "Có đông không?", "Khi nào khởi hành?", "Bị lỡ xe"],
};

const GREETING_ACTIONS: ChatbotAction[] = [
  {
    id: "book-ticket",
    label: "Book a ticket",
    kind: "send_message",
    payload: { message: "I want to book" },
  },
  {
    id: "check-booking",
    label: "Check my booking",
    kind: "send_message",
    payload: { message: "Check my booking" },
  },
  {
    id: "crowd-levels",
    label: "Ask about crowd levels",
    kind: "send_message",
    payload: { message: "Is it crowded?" },
  },
  {
    id: "rebook-missed",
    label: "Rebook missed bus",
    kind: "send_message",
    payload: { message: "I missed my bus" },
  },
];

// ---------------------------------------------------------------------------
// Browser language detection
// ---------------------------------------------------------------------------

function detectBrowserLanguage(): LanguageCode {
  if (typeof window === "undefined") return "en";
  const browserLang = navigator.language || "";
  if (browserLang.startsWith("tl") || browserLang.startsWith("fil")) return "fil";
  if (browserLang.startsWith("id")) return "id";
  if (browserLang.startsWith("vi")) return "vi";
  return "en";
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  role: "user" | "bot";
  text: string;
  language?: string;
  languageConfidence?: number | null;
  intent?: string;
  suggested_actions?: string[];
  actions?: ChatbotAction[];
  degradation?: number;
}

interface ChatbotPanelProps {
  bookingId?: string;
}

type ActionLike = ChatbotAction | string;

function suggestionToQuery(action: string): string {
  const normalized = action.toLowerCase();
  if (
    normalized.includes("cancel") ||
    normalized.includes("start over") ||
    normalized.includes("main menu") ||
    normalized.includes("reset")
  ) {
    return "cancel";
  }
  if (normalized.includes("qr") || normalized.includes("boarding")) {
    return "Check my booking";
  }
  if (normalized.includes("book") || normalized.includes("route") || normalized.includes("schedule")) {
    return "I want to book";
  }
  if (normalized.includes("crowd") || normalized.includes("forecast") || normalized.includes("ramai")) {
    return "Is it crowded?";
  }
  if (normalized.includes("phone")) {
    return "I want to use my phone number";
  }
  if (normalized.includes("booking id")) {
    return "I have a booking ID";
  }
  return action;
}

function isBookNavigation(action: string): boolean {
  const normalized = action.toLowerCase().trim();
  return (
    normalized === "book a ticket" ||
    normalized === "search and book" ||
    normalized.includes("search routes")
  );
}

function isBookingDetailNavigation(action: string): boolean {
  const normalized = action.toLowerCase();
  return (
    normalized.includes("view booking") ||
    normalized.includes("qr") ||
    normalized.includes("boarding time")
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChatbotPanel({ bookingId }: ChatbotPanelProps) {
  const router = useRouter();
  const initialLang = detectBrowserLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState<LanguageCode>(initialLang);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const initializedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Floating trigger position and dragging state
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    elemX: number;
    elemY: number;
    hasMoved: boolean;
  }>({ pointerX: 0, pointerY: 0, elemX: 0, elemY: 0, hasMoved: false });
  const justDraggedRef = useRef(false);

  // Pointer drag handlers for mobile touch and desktop mouse
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only primary button
    const el = triggerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      elemX: rect.left,
      elemY: rect.top,
      hasMoved: false,
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Safe fallback if pointer capture is not supported
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;

    const dx = e.clientX - dragStartRef.current.pointerX;
    const dy = e.clientY - dragStartRef.current.pointerY;

    if (!dragStartRef.current.hasMoved) {
      if (Math.hypot(dx, dy) > 5) {
        dragStartRef.current.hasMoved = true;
        setIsDragging(true);
      } else {
        return;
      }
    }

    const buttonSize = 56;
    const margin = 8;
    const maxX = Math.max(margin, window.innerWidth - buttonSize - margin);
    const maxY = Math.max(margin, window.innerHeight - buttonSize - margin);

    const newX = Math.max(margin, Math.min(maxX, dragStartRef.current.elemX + dx));
    const newY = Math.max(margin, Math.min(maxY, dragStartRef.current.elemY + dy));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
    }

    if (dragStartRef.current.hasMoved) {
      setIsDragging(false);
      justDraggedRef.current = true;
      setTimeout(() => {
        justDraggedRef.current = false;
      }, 150);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
    }
    setIsDragging(false);
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    if (justDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setIsOpen((prev) => !prev);
  };

  // Re-clamp position on window resize or device orientation change
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null;
        const buttonSize = 56;
        const margin = 8;
        const maxX = Math.max(margin, window.innerWidth - buttonSize - margin);
        const maxY = Math.max(margin, window.innerHeight - buttonSize - margin);
        const clampedX = Math.max(margin, Math.min(maxX, prev.x));
        const clampedY = Math.max(margin, Math.min(maxY, prev.y));
        if (clampedX === prev.x && clampedY === prev.y) return prev;
        return { x: clampedX, y: clampedY };
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  // Initialize session when panel opens for the first time
  useEffect(() => {
    if (isOpen && !initializedRef.current) {
      initializedRef.current = true;
      createChatSession(lang)
        .then((res) => {
          setSessionId(res.session_id);
          setMessages([
            {
              role: "bot",
              text: applyFrontendBrand(res.greeting),
              intent: "greeting",
              actions: GREETING_ACTIONS,
            },
          ]);
          scrollToBottom();
        })
        .catch(() => {
          setMessages([
            {
              role: "bot",
              text: `Hi! I'm the ${BRAND.name} assistant. How can I help?`,
              intent: "greeting",
              actions: GREETING_ACTIONS,
            },
          ]);
        });
    }
    if (isOpen) scrollToBottom();
  }, [isOpen, lang, scrollToBottom]);

  // --- Handlers ---

  const handleSend = async (text?: string) => {
    const query = (text || input).trim();
    if (!query || loading) return;

    const userMsg: Message = { role: "user", text: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response: ChatbotResponse = await sendChatMessage({
        query,
        booking_id: bookingId,
        language: lang,
        session_id: sessionId || undefined,
      });

      if (response.session_id && !sessionId) {
        setSessionId(response.session_id);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: applyFrontendBrand(response.response_text),
          language: response.detected_language,
          languageConfidence: response.language_confidence,
          intent: response.intent,
          suggested_actions: response.suggested_actions,
          actions: response.actions,
          degradation: response.degradation_level,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: UI_STRINGS[lang].error,
          intent: "error",
        },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const handleSuggestionClick = async (action: ActionLike) => {
    if (typeof action === "string") {
      if (isBookNavigation(action)) {
        router.push("/buy");
        setIsOpen(false);
        return;
      }

      if (isBookingDetailNavigation(action)) {
        const previousAction = [...messages]
          .reverse()
          .flatMap((message) => message.actions || [])
          .find((item) =>
            action.toLowerCase().includes("qr")
              ? item.kind === "open_qr"
              : item.kind === "open_booking" || item.kind === "open_qr"
          );

        if (previousAction) {
          await handleSuggestionClick(previousAction);
          return;
        }
      }

      await handleSend(suggestionToQuery(action));
      return;
    }

    if (action.kind === "send_message") {
      const message = String(action.payload.message || action.label);
      if (action.id === "book-ticket" || isBookNavigation(message)) {
        router.push("/buy");
        setIsOpen(false);
        return;
      }
      await handleSend(message);
      return;
    }

    if (action.kind === "prefill_route_search") {
      const params = new URLSearchParams();
      for (const key of ["origin", "destination", "date", "route_id"]) {
        const value = action.payload[key];
        if (value != null && value !== "") params.set(key, String(value));
      }
      router.push(`/buy${params.toString() ? `?${params.toString()}` : ""}`);
      setIsOpen(false);
      return;
    }

    if (action.kind === "open_booking" || action.kind === "open_qr") {
      const targetBookingId = action.payload.booking_id;
      if (targetBookingId) {
        router.push(`/confirmation/${String(targetBookingId)}`);
        setIsOpen(false);
      } else {
        await handleSend("Check my booking");
      }
      return;
    }

    if (action.kind === "handoff") {
      await handleSend(String(action.payload.message || "Contact support"));
    }
  };

  const handleLanguageChange = async (code: LanguageCode) => {
    setLang(code);
    // Start a fresh session in the new language
    try {
      const res = await createChatSession(code);
      setSessionId(res.session_id);
      setMessages([
        {
          role: "bot",
          text: applyFrontendBrand(res.greeting),
          intent: "greeting",
          actions: GREETING_ACTIONS,
        },
      ]);
    } catch {
      // Keep existing state
    }
  };

  // --- Render ---

  return (
    <>
      {/* Floating Chatbot Button — Placed by default on the upper right side of the bottom navbar on mobile; freely draggable */}
      <div
        ref={triggerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onDragStart={(e) => e.preventDefault()}
        style={
          position
            ? {
                left: `${position.x}px`,
                top: `${position.y}px`,
                bottom: "auto",
                right: "auto",
              }
            : undefined
        }
        className={`fixed z-40 touch-none select-none ${
          position
            ? ""
            : "bottom-24 right-4 md:bottom-6 md:right-6"
        } ${isDragging ? "cursor-grabbing scale-105" : "cursor-grab"}`}
      >
        {!isOpen && !isDragging && (
          <>
            {/* Primary background pulse wave */}
            <span
              className="absolute inset-0 rounded-full bg-blue-500/40 animate-sonar-wave pointer-events-none"
              aria-hidden="true"
            />
            {/* Secondary staggered pulse wave for continuous silky aura */}
            <span
              className="absolute inset-0 rounded-full bg-blue-400/30 animate-sonar-wave [animation-delay:1.2s] pointer-events-none"
              aria-hidden="true"
            />
          </>
        )}
        <button
          type="button"
          onClick={handleButtonClick}
          className={`relative rounded-full bg-blue-700 h-14 w-14 min-w-[56px] min-h-[56px] flex items-center justify-center text-white shadow-xl shadow-blue-900/40 hover:bg-blue-600 ${
            isDragging
              ? "ring-4 ring-blue-400/60 shadow-2xl shadow-blue-900/70"
              : "active:scale-95 transition-colors duration-200"
          } focus:outline-none focus:ring-4 focus:ring-blue-400/40`}
          aria-label={isOpen ? `Close ${BRAND.assistantName}` : `Chat with ${BRAND.assistantName} (drag to reposition)`}
          title={isOpen ? `Close ${BRAND.assistantName}` : `Chat with ${BRAND.assistantName} (drag to reposition)`}
          aria-expanded={isOpen}
          aria-controls="iqueue-chatbot-panel"
        >
          {isOpen ? (
            <X className="h-6 w-6 pointer-events-none" />
          ) : (
            <>
              <MessageCircle className="h-6 w-6 pointer-events-none" />
              {/* Online indicator dot */}
              <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-blue-700 pointer-events-none" />
            </>
          )}
        </button>
      </div>

      {/* Chat Panel */}
      {isOpen && (
        <div
          id="iqueue-chatbot-panel"
          role="dialog"
          aria-modal="false"
          aria-label={UI_STRINGS[lang].title}
          className="fixed bottom-24 left-3 right-3 mx-0 sm:left-auto sm:right-6
                     w-auto sm:w-96 h-[min(72dvh,540px)] max-h-[calc(100dvh-7rem)]
                     bg-white dark:bg-slate-900
                     rounded-2xl shadow-2xl dark:shadow-2xl dark:shadow-black/60
                     border dark:border-white/15
                     flex flex-col z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-blue-700 text-white p-4 flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-bold text-base">{UI_STRINGS[lang].title}</h3>
              <p className="text-xs text-blue-200">{UI_STRINGS[lang].subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close assistant"
              className="h-10 w-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl hover:bg-white/15 active:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Language Selector */}
          <div
            className="flex items-center gap-1 px-3 py-2 border-b
                       dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shrink-0"
          >
            {LANGUAGES.map((l) => (
              <button
                type="button"
                key={l.code}
                onClick={() => handleLanguageChange(l.code)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  lang === l.code
                    ? "bg-blue-700 text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                }`}
                title={l.label}
              >
                <span>{l.flag}</span>
                <span className="hidden sm:inline">{l.label}</span>
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-blue-700 text-white"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-200"
                  }`}
                >
                  <p>{msg.text}</p>

                  {/* Suggested action pills */}
                  {msg.role === "bot" && (
                    (() => {
                      const actionItems: ActionLike[] =
                        msg.actions && msg.actions.length > 0
                          ? msg.actions
                          : msg.suggested_actions || [];
                      return actionItems.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {actionItems.map((action, ai) => (
                          <button
                            type="button"
                            key={ai}
                            onClick={() => handleSuggestionClick(action)}
                            disabled={loading}
                            className="text-xs bg-blue-50 dark:bg-blue-900/30
                                       text-blue-700 dark:text-blue-300
                                       border border-blue-200 dark:border-blue-800
                                       rounded-full px-2.5 py-1
                                       hover:bg-blue-100 dark:hover:bg-blue-900/50
                                       disabled:opacity-50 disabled:cursor-not-allowed
                                       transition-colors"
                          >
                            {typeof action === "string" ? action : action.label}
                          </button>
                        ))}
                      </div>
                      ) : null;
                    })()
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-gray-400 dark:text-slate-500 text-sm px-2">
                <span className="w-2 h-2 bg-blue-700 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-blue-700 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-blue-700 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick reply buttons */}
          {messages.length > 0 && !loading && (
            <div className="px-3 py-2 flex gap-1.5 overflow-x-auto border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 shrink-0">
              {QUICK_REPLIES[lang].map((reply, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => handleSuggestionClick(reply)}
                  className="flex-shrink-0 min-h-[38px] text-xs px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border dark:border-white/10 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center"
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t dark:border-slate-800 p-3 flex gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={UI_STRINGS[lang].placeholder}
              disabled={loading}
              className="flex-1 border border-gray-300 dark:border-slate-700
                         rounded-xl px-3.5 py-2.5 text-base
                         dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500
                         focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                         focus:border-blue-500 dark:focus:border-blue-400
                         disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="bg-blue-700 text-white min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center p-2.5
                         hover:bg-blue-800
                         disabled:bg-gray-300 dark:disabled:bg-slate-700
                         disabled:cursor-not-allowed active:scale-95 transition"
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
