"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { sendChatMessage, createChatSession } from "@/lib/api";
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
    title: "IQueue Assistant",
    subtitle: "AI-powered · 4 languages",
    placeholder: "Type your question...",
    thinking: "Thinking...",
    error: "Sorry, I'm having trouble connecting. Please try again later.",
  },
  fil: {
    title: "IQueue Assistant",
    subtitle: "AI-powered · 4 na wika",
    placeholder: "I-type ang iyong tanong...",
    thinking: "Nag-iisip...",
    error: "Paumanhin, may problema sa koneksyon. Pakisubukan muli.",
  },
  id: {
    title: "Asisten IQueue",
    subtitle: "Chatbot AI · 4 bahasa",
    placeholder: "Ketik pertanyaan Anda...",
    thinking: "Berpikir...",
    error: "Maaf, saya mengalami masalah koneksi. Silakan coba lagi nanti.",
  },
  vi: {
    title: "Trợ lý IQueue",
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
            { role: "bot", text: res.greeting, intent: "greeting", actions: GREETING_ACTIONS },
          ]);
          scrollToBottom();
        })
        .catch(() => {
          setMessages([
            {
              role: "bot",
              text: "Hi! I'm the IQueue assistant. How can I help?",
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
          text: response.response_text,
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
      await handleSend(suggestionToQuery(action));
      return;
    }

    if (action.kind === "send_message") {
      await handleSend(String(action.payload.message || action.label));
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
        { role: "bot", text: res.greeting, intent: "greeting", actions: GREETING_ACTIONS },
      ]);
    } catch {
      // Keep existing state
    }
  };

  // --- Render ---

  return (
    <>
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-4 rounded-full bg-blue-700 p-3 text-white shadow-lg
                   md:bottom-6 md:right-6
                   hover:bg-blue-800 transition z-50"
        aria-label={isOpen ? "Close IQueue Assistant" : "Chat with IQueue Assistant"}
        aria-expanded={isOpen}
        aria-controls="iqueue-chatbot-panel"
      >
        {isOpen ? (
          <X className="h-5 w-5 md:h-6 md:w-6" />
        ) : (
          <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          id="iqueue-chatbot-panel"
          role="dialog"
          aria-modal="false"
          aria-label={UI_STRINGS[lang].title}
          className="fixed bottom-40 left-3 right-3 mx-0 sm:left-auto sm:right-6
                     w-auto sm:w-96 h-[min(68dvh,520px)] max-h-[calc(100dvh-10rem)]
                     md:bottom-24
                     bg-white dark:bg-slate-900
                     rounded-xl shadow-2xl dark:shadow-2xl dark:shadow-black/40
                     border dark:border-white/10
                     flex flex-col z-50"
        >
          {/* Header */}
          <div className="bg-blue-700 text-white p-4 rounded-t-xl flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-semibold">{UI_STRINGS[lang].title}</h3>
              <p className="text-xs text-blue-200">{UI_STRINGS[lang].subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close assistant"
            >
              <X className="w-4 h-4" />
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
                  className="flex-shrink-0 text-[11px] px-3 py-1.5 rounded-full bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border dark:border-white/10 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
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
                         rounded-lg px-3 py-2 text-sm
                         dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500
                         focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                         focus:border-blue-500 dark:focus:border-blue-400
                         disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="bg-blue-700 text-white p-2 rounded-lg
                         hover:bg-blue-800
                         disabled:bg-gray-300 dark:disabled:bg-slate-700
                         disabled:cursor-not-allowed transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
