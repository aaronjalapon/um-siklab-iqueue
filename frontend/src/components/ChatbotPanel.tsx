"use client";

import { useState } from "react";
import { sendChatMessage } from "@/lib/api";
import type { ChatbotResponse } from "@/lib/types";
import { LANGUAGE_LABELS } from "@/lib/utils";
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

const GREETINGS: Record<LanguageCode, string> = {
  en: "Hi! I'm the IQueue assistant. I can help you check your booking, find departure info, or answer questions about surge crowds. How can I help?",
  fil: "Kumusta! Ako ang IQueue assistant. Matutulungan kitang tingnan ang iyong booking, alamin ang oras ng alis, o sagutin ang mga tanong tungkol sa dami ng tao. Paano ako makakatulong?",
  id: "Halo! Saya asisten IQueue. Saya bisa membantu Anda memeriksa pemesanan, mencari info keberangkatan, atau menjawab pertanyaan tentang tingkat keramaian. Ada yang bisa saya bantu?",
  vi: "Xin chào! Tôi là trợ lý IQueue. Tôi có thể giúp bạn kiểm tra đặt vé, tìm thông tin khởi hành, hoặc trả lời câu hỏi về mức độ đông đúc. Tôi có thể giúp gì?",
};

// ---------------------------------------------------------------------------
// UI chrome strings (localised per language)
// ---------------------------------------------------------------------------

const UI_STRINGS: Record<LanguageCode, { title: string; subtitle: string; placeholder: string; thinking: string; error: string }> = {
  en: {
    title: "IQueue Assistant",
    subtitle: "AI-powered chatbot · 4 languages",
    placeholder: "Type your question...",
    thinking: "Thinking...",
    error: "Sorry, I'm having trouble connecting. Please try again later.",
  },
  fil: {
    title: "IQueue Assistant",
    subtitle: "AI-powered chatbot · 4 na wika",
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
  intent?: string;
  suggested_actions?: string[];
}

interface ChatbotPanelProps {
  bookingId?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChatbotPanel({ bookingId }: ChatbotPanelProps) {
  const initialLang = detectBrowserLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState<LanguageCode>(initialLang);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: GREETINGS[initialLang],
      intent: "greeting",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // --- Handlers ---

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response: ChatbotResponse = await sendChatMessage({
        query: userMsg.text,
        booking_id: bookingId,
        language: lang,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: response.response_text,
          language: response.detected_language,
          intent: response.intent,
          suggested_actions: response.suggested_actions,
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
    }
  };

  const handleSuggestionClick = async (action: string) => {
    if (loading) return;

    const userMsg: Message = { role: "user", text: action };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response: ChatbotResponse = await sendChatMessage({
        query: action,
        booking_id: bookingId,
        language: lang,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: response.response_text,
          language: response.detected_language,
          intent: response.intent,
          suggested_actions: response.suggested_actions,
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
    }
  };

  const handleLanguageChange = (code: LanguageCode) => {
    setLang(code);
    // Replace the greeting with the selected language version
    setMessages((prev) => {
      const updated = [...prev];
      if (updated.length > 0 && updated[0].intent === "greeting") {
        updated[0] = {
          ...updated[0],
          text: GREETINGS[code],
        };
      }
      return updated;
    });
  };

  // --- Render ---

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-blue-700 text-white p-4 rounded-full shadow-lg
                   hover:bg-blue-800 transition z-50"
        title="Chat with IQueue Assistant"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-0 left-0 mx-4 sm:mx-auto sm:right-6 sm:left-auto
                     w-auto sm:w-96 h-[70vh] max-h-[520px]
                     bg-white dark:bg-slate-900
                     rounded-xl shadow-2xl dark:shadow-2xl dark:shadow-black/40
                     border dark:border-white/10
                     flex flex-col z-50"
        >
          {/* Header */}
          <div className="bg-blue-700 text-white p-4 rounded-t-xl flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-semibold">{UI_STRINGS[lang].title}</h3>
              <p className="text-xs text-blue-200">
                {UI_STRINGS[lang].subtitle}
              </p>
            </div>
            <button onClick={() => setIsOpen(false)}>
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
                  {msg.language && (
                    <span className="text-xs opacity-70 mt-1 block">
                      {LANGUAGE_LABELS[msg.language] || msg.language}
                      {msg.intent &&
                        msg.intent !== "fallback" &&
                        msg.intent !== "greeting" && (
                          <> · {msg.intent.replace(/_/g, " ")}</>
                        )}
                    </span>
                  )}

                  {/* Action pill buttons */}
                  {msg.role === "bot" &&
                    msg.suggested_actions &&
                    msg.suggested_actions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {msg.suggested_actions.map((action, ai) => (
                          <button
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
                            {action}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-center text-gray-400 dark:text-slate-500 text-sm">
                {UI_STRINGS[lang].thinking}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t dark:border-slate-800 p-3 flex gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={UI_STRINGS[lang].placeholder}
              className="flex-1 border border-gray-300 dark:border-slate-700
                         rounded-lg px-3 py-2 text-sm
                         dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500
                         focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                         focus:border-blue-500 dark:focus:border-blue-400"
            />
            <button
              onClick={handleSend}
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
