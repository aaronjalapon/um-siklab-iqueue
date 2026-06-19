"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Globe, Loader2 } from "lucide-react";
import { createChatSession, sendChatMessage } from "@/lib/api";
import type { ChatbotResponse } from "@/lib/types";
import { LANGUAGE_LABELS } from "@/lib/utils";

type Language = "en" | "fil" | "id" | "vi";

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "fil", label: "Filipino", flag: "🇵🇭" },
  { code: "id", label: "Bahasa", flag: "🇮🇩" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
];

function detectBrowserLanguage(): Language {
  if (typeof window === "undefined") return "en";
  const browserLang = navigator.language || "";
  if (browserLang.startsWith("tl") || browserLang.startsWith("fil")) return "fil";
  if (browserLang.startsWith("id")) return "id";
  if (browserLang.startsWith("vi")) return "vi";
  return "en";
}

interface Message {
  role: "bot" | "user";
  content: string;
  intent?: string;
  suggested_actions?: string[];
  detected_language?: string;
  language_confidence?: number | null;
}

const QUICK_REPLIES: Record<Language, string[]> = {
  en: ["Check my booking", "Is it crowded this weekend?", "When does my bus leave?", "I missed my bus"],
  fil: ["Tingnan ang booking ko", "Marami bang tao ngayong weekend?", "Kailan aalis ang bus ko?", "Naiwan ako ng bus"],
  id: ["Cek pemesanan saya", "Apakah ramai akhir pekan ini?", "Kapan bus saya berangkat?", "Saya ketinggalan bus"],
  vi: ["Kiểm tra đặt vé của tôi", "Cuối tuần này có đông không?", "Khi nào xe tôi khởi hành?", "Tôi bị lỡ xe"],
};

export default function ChatbotTeaser() {
  const initialLang = detectBrowserLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState<Language>(initialLang);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  // Initialize session when chat opens for the first time
  useEffect(() => {
    if (isOpen && !initializedRef.current) {
      initializedRef.current = true;
      createChatSession(lang)
        .then((res) => {
          setSessionId(res.session_id);
          setMessages([
            {
              role: "bot",
              content: res.greeting,
              intent: "greeting",
            },
          ]);
          scrollToBottom();
        })
        .catch(() => {
          setError("Unable to connect. Please try again later.");
          setMessages([
            {
              role: "bot",
              content: "Hi! I'm the IQueue assistant. How can I help you today?",
              intent: "greeting",
            },
          ]);
        });
    }
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, lang, scrollToBottom]);

  const handleSend = async (text?: string) => {
    const query = (text || inputVal).trim();
    if (!query || loading) return;

    const userMsg: Message = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setLoading(true);
    setError(null);

    try {
      const response: ChatbotResponse = await sendChatMessage({
        query,
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
          content: response.response_text,
          intent: response.intent,
          suggested_actions: response.suggested_actions,
          detected_language: response.detected_language,
          language_confidence: response.language_confidence,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: "Sorry, I'm having trouble connecting. Please try again later.",
          intent: "error",
        },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const handleLanguageChange = async (code: Language) => {
    setLang(code);
    // Create a new session in the new language
    try {
      const res = await createChatSession(code);
      setSessionId(res.session_id);
      setMessages([
        {
          role: "bot",
          content: res.greeting,
          intent: "greeting",
        },
      ]);
    } catch {
      // Keep existing messages if session creation fails
    }
  };

  return (
    <>
      {/* Chat bubble */}
      <motion.button
        id="chatbot-teaser-toggle"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Open IQueue chatbot"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.5, type: "spring", stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-700 rounded-full flex items-center justify-center shadow-xl shadow-blue-700/40"
      >
        {/* Pulsing outer ring */}
        <span className="absolute inset-0 rounded-full bg-blue-700/40 animate-ping" />
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.span key="close" initial={{ rotate: -90 }} animate={{ rotate: 0 }} exit={{ rotate: 90 }}>
              <X className="w-6 h-6 text-white relative z-10" />
            </motion.span>
          ) : (
            <motion.span key="open" initial={{ rotate: 90 }} animate={{ rotate: 0 }} exit={{ rotate: -90 }}>
              <MessageCircle className="w-6 h-6 text-white relative z-10" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="chatbot-teaser-panel"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 flex flex-col rounded-2xl overflow-hidden border border-white/15 shadow-2xl shadow-black/40 bg-slate-900 backdrop-blur-xl"
            style={{ maxHeight: "min(560px, calc(100vh - 120px))" }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-4 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-white font-bold text-sm">IQueue Assistant</p>
                <p className="text-blue-200 text-xs mt-0.5">Powered by AI · 4 ASEAN languages</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-blue-200 text-xs">Live</span>
              </div>
            </div>

            {/* Language selector */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 bg-slate-800/60 flex-shrink-0">
              <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div className="flex gap-2 overflow-x-auto">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => handleLanguageChange(l.code)}
                    className={`flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
                      lang === l.code
                        ? "bg-blue-700 text-white"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/10"
                    }`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
              <AnimatePresence mode="popLayout">
                {messages.map((msg, i) => (
                  <motion.div
                    key={`${lang}-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.08, 0.5), duration: 0.3 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-blue-700 text-white rounded-br-sm"
                          : "bg-slate-800 text-slate-200 rounded-bl-sm border border-white/10"
                      }`}
                    >
                      <p>{msg.content}</p>
                      {msg.role === "bot" && msg.detected_language && (
                        <span className="text-xs opacity-60 mt-1 block">
                          {LANGUAGE_LABELS[msg.detected_language] || msg.detected_language}
                          {msg.intent && msg.intent !== "fallback" && msg.intent !== "greeting" && msg.intent !== "error" && (
                            <> · {msg.intent.replace(/_/g, " ")}</>
                          )}
                        </span>
                      )}

                      {/* Suggested action buttons */}
                      {msg.role === "bot" && msg.suggested_actions && msg.suggested_actions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {msg.suggested_actions.map((action, ai) => (
                            <button
                              key={ai}
                              onClick={() => handleSend(action)}
                              disabled={loading}
                              className="text-xs bg-blue-700/20 text-blue-300 border border-blue-700/30 rounded-full px-2.5 py-1 hover:bg-blue-700/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {action}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                {loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-slate-400 text-sm px-2"
                  >
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Thinking…
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Quick replies */}
            {messages.length > 0 && !loading && (
              <div className="px-4 py-2 flex gap-1.5 overflow-x-auto border-t border-white/5 bg-slate-800/40 flex-shrink-0">
                {QUICK_REPLIES[lang].map((reply, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(reply)}
                    className="flex-shrink-0 text-[11px] px-3 py-1.5 rounded-full bg-slate-700/80 text-slate-300 border border-white/10 hover:bg-blue-700/30 hover:text-blue-200 hover:border-blue-700/30 transition-colors"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}

            {/* Input row */}
            <div className="px-4 py-3 border-t border-white/10 bg-slate-800/60 flex-shrink-0">
              {error && (
                <p className="text-red-400 text-xs mb-2 text-center">{error}</p>
              )}
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type a message…"
                  disabled={loading}
                  className="flex-1 bg-slate-700/80 border border-white/10 text-slate-200 placeholder-slate-500 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-700/50 disabled:opacity-50"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={loading || !inputVal.trim()}
                  className="w-9 h-9 flex-shrink-0 bg-blue-700 text-white rounded-xl flex items-center justify-center hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
