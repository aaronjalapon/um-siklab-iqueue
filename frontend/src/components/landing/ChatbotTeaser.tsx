"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Globe } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFlag, faHand, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

type Language = "en" | "fil" | "ms" | "vi";

const LANGUAGE_OPTIONS: { code: Language; label: string; icon: IconDefinition }[] = [
  { code: "en", label: "English", icon: faFlag },
  { code: "fil", label: "Filipino", icon: faFlag },
  { code: "ms", label: "Bahasa", icon: faFlag },
  { code: "vi", label: "Tiếng Việt", icon: faFlag },
];

type Message = { role: "bot" | "user"; content: ReactNode };

function InlineIcon({ icon, className }: { icon: IconDefinition; className?: string }) {
  return <FontAwesomeIcon icon={icon} className={`inline-block align-[-0.1em] ${className ?? ""}`} />;
}

const DEMO_CONVERSATIONS: Record<Language, Message[]> = {
  en: [
    {
      role: "bot",
      content: (
        <>
          Hi! I'm your IQueue assistant <InlineIcon icon={faHand} className="text-amber-300" /> I can help with
          bookings, surge alerts, and departure info. How can I help?
        </>
      ),
    },
    { role: "user", content: "Is the Manila–Davao route crowded this weekend?" },
    {
      role: "bot",
      content: (
        <>
          <InlineIcon icon={faTriangleExclamation} className="text-yellow-400" /> Surge detected! Demand is predicted
          to be +340% above normal this weekend (Eid holiday). I recommend booking now before seats fill up. Want me to
          find you the best seat?
        </>
      ),
    },
  ],
  fil: [
    {
      role: "bot",
      content: (
        <>
          Kamusta! Ako ang iyong IQueue assistant <InlineIcon icon={faHand} className="text-amber-300" /> Makakatulong
          ako sa mga booking, abiso ng pagsabog ng pasahero, at impormasyon ng pagalis. Paano kita matutulungan?
        </>
      ),
    },
    { role: "user", content: "May bakanteng upuan pa ba sa Manila–Davao ngayong Sabado?" },
    {
      role: "bot",
      content: (
        <>
          <InlineIcon icon={faTriangleExclamation} className="text-yellow-400" /> May matinding surge ngayong weekend!
          Inaasahan na +340% higit sa normal ang demand dahil sa holiday. Inirerekomenda ko na mag-book na agad bago
          maubusan. Gusto mo bang mahanap ko ang pinakamahusay na upuan para sa iyo?
        </>
      ),
    },
  ],
  ms: [
    {
      role: "bot",
      content: (
        <>
          Hai! Saya pembantu IQueue anda <InlineIcon icon={faHand} className="text-amber-300" /> Saya boleh membantu
          dengan tempahan, amaran lonjakan, dan maklumat berlepas. Apa yang boleh saya bantu?
        </>
      ),
    },
    { role: "user", content: "Adakah laluan Manila–Davao sesak hujung minggu ini?" },
    {
      role: "bot",
      content: (
        <>
          <InlineIcon icon={faTriangleExclamation} className="text-yellow-400" /> Lonjakan dikesan! Permintaan dijangka
          +340% melebihi paras normal hujung minggu ini (cuti Hari Raya). Saya cadangkan anda tempah sekarang sebelum
          tempat duduk habis. Mahu saya carikan tempat duduk terbaik untuk anda?
        </>
      ),
    },
  ],
  vi: [
    {
      role: "bot",
      content: (
        <>
          Xin chào! Tôi là trợ lý IQueue của bạn <InlineIcon icon={faHand} className="text-amber-300" /> Tôi có thể
          giúp đặt vé, cảnh báo tắc nghẽn, và thông tin khởi hành. Tôi có thể giúp gì cho bạn?
        </>
      ),
    },
    { role: "user", content: "Tuyến Manila–Davao có đông khách cuối tuần này không?" },
    {
      role: "bot",
      content: (
        <>
          <InlineIcon icon={faTriangleExclamation} className="text-yellow-400" /> Phát hiện lượng khách tăng vọt! Nhu
          cầu dự kiến tăng +340% so với bình thường cuối tuần này (nghỉ lễ). Tôi khuyên bạn nên đặt vé ngay trước khi
          hết chỗ. Bạn có muốn tôi tìm chỗ ngồi tốt nhất cho bạn không?
        </>
      ),
    },
  ],
};

export default function ChatbotTeaser() {
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState<Language>("en");
  const [inputVal, setInputVal] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = DEMO_CONVERSATIONS[lang];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [isOpen, lang]);

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
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-brand-blue rounded-full flex items-center justify-center shadow-xl shadow-brand-blue/40"
      >
        {/* Pulsing outer ring */}
        <span className="absolute inset-0 rounded-full bg-brand-blue/40 animate-ping" />
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
            <div className="bg-gradient-to-r from-brand-blue to-blue-700 px-4 py-4 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-white font-bold text-sm">IQueue Assistant</p>
                <p className="text-blue-200 text-xs mt-0.5">AI-powered · 4 ASEAN languages</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-blue-200 text-xs">Demo</span>
              </div>
            </div>

            {/* Language selector */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 bg-slate-800/60 flex-shrink-0">
              <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div className="flex gap-2 overflow-x-auto">
                {LANGUAGE_OPTIONS.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className={`flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
                      lang === l.code
                        ? "bg-brand-blue text-white"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/10"
                    }`}
                  >
                    <FontAwesomeIcon icon={l.icon} className="text-[10px]" />
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
                    transition={{ delay: i * 0.12, duration: 0.3 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-brand-blue text-white rounded-br-sm"
                          : "bg-slate-800 text-slate-200 rounded-bl-sm border border-white/10"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input row */}
            <div className="px-4 py-3 border-t border-white/10 bg-slate-800/60 flex-shrink-0">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1 bg-slate-700/80 border border-white/10 text-slate-200 placeholder-slate-500 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-blue/50"
                />
                <button
                  disabled
                  className="w-9 h-9 flex-shrink-0 bg-brand-blue/50 text-white/50 rounded-xl flex items-center justify-center cursor-not-allowed"
                  title="Connect to backend to enable"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-center text-slate-600 text-[10px] mt-2">
                Demo mode — real AI backend coming in Sprint 3 ·{" "}
                <a href="/buy" className="text-brand-blue hover:underline">
                  Try the app →
                </a>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
