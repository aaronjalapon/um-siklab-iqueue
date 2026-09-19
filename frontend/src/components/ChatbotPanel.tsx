"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { sendChatMessage, createChatSession } from "@/lib/api";
import { applyFrontendBrand, BRAND } from "@/lib/brand";
import type { ChatbotAction, ChatbotResponse } from "@/lib/types";
import { ChevronLeft, ChevronRight, MessageCircle, Send, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Language config
// ---------------------------------------------------------------------------

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fil", label: "Filipino" },
  { code: "id", label: "Bahasa" },
  { code: "vi", label: "Tiếng Việt" },
] as const;

type LanguageCode = (typeof LANGUAGES)[number]["code"];

const UI_STRINGS: Record<
  LanguageCode,
  { title: string; subtitle: string; placeholder: string; thinking: string; error: string }
> = {
  en: {
    title: BRAND.assistantName,
    subtitle: "Prototype assistant · 4 languages",
    placeholder: "Type your question...",
    thinking: "Thinking...",
    error: "Sorry, I'm having trouble connecting. Please try again later.",
  },
  fil: {
    title: BRAND.assistantName,
    subtitle: "Prototype assistant · 4 na wika",
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
  hideLauncher?: boolean;
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

export default function ChatbotPanel({ bookingId, hideLauncher = false }: ChatbotPanelProps) {
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
  const quickRepliesRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateQuickRepliesScroll = useCallback(() => {
    const el = quickRepliesRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
  }, []);

  useEffect(() => {
    const openAssistant = () => setIsOpen(true);
    window.addEventListener("tripsync:open-assistant", openAssistant);
    return () => window.removeEventListener("tripsync:open-assistant", openAssistant);
  }, []);

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
  const lastToggleTimeRef = useRef(0);

  const toggleAssistant = useCallback(() => {
    setIsOpen((prev) => !prev);
    lastToggleTimeRef.current = Date.now();
  }, []);

  // Lock background scroll on mobile screen devices when chatbot panel is open
  useEffect(() => {
    if (!isOpen) return;

    const syncScrollLock = () => {
      // Mobile screen devices (< 640px)
      if (window.innerWidth < 640) {
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
        document.body.style.touchAction = "none";
        window.__lenis?.stop();
      } else {
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
        document.body.style.touchAction = "";
        window.__lenis?.start();
      }
    };

    syncScrollLock();
    window.addEventListener("resize", syncScrollLock);

    return () => {
      window.removeEventListener("resize", syncScrollLock);
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.touchAction = "";
      window.__lenis?.start();
    };
  }, [isOpen]);

  // Handle escape key to close assistant
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Detect if an external modal or dialog is open in the application
  const [isExternalModalOpen, setIsExternalModalOpen] = useState(false);

  useEffect(() => {
    const detectExternalModal = () => {
      const modal = document.querySelector('[role="dialog"]:not(#iqueue-chatbot-panel)');
      setIsExternalModalOpen(Boolean(modal));
    };

    detectExternalModal();

    const observer = new MutationObserver(detectExternalModal);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["role", "aria-modal", "class"],
    });

    return () => observer.disconnect();
  }, []);

  // Pointer drag handlers for mobile touch and desktop mouse
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isExternalModalOpen) return;
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
    if (isExternalModalOpen) return;
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;

    const dx = e.clientX - dragStartRef.current.pointerX;
    const dy = e.clientY - dragStartRef.current.pointerY;

    if (!dragStartRef.current.hasMoved) {
      if (Math.hypot(dx, dy) >= 8) {
        dragStartRef.current.hasMoved = true;
        setIsDragging(true);
      } else {
        return;
      }
    }

    const buttonSize = 56;
    const margin = 12;
    const maxX = Math.max(margin, window.innerWidth - buttonSize - margin);
    const maxY = Math.max(margin, window.innerHeight - buttonSize - margin);

    const newX = Math.max(margin, Math.min(maxX, dragStartRef.current.elemX + dx));
    const newY = Math.max(margin, Math.min(maxY, dragStartRef.current.elemY + dy));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isExternalModalOpen) return;
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
      }, 200);
    } else {
      setIsDragging(false);
      toggleAssistant();
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
    if (isExternalModalOpen) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (justDraggedRef.current || Date.now() - lastToggleTimeRef.current < 350) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    toggleAssistant();
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

  // Keep messages scrolled to bottom as the conversation progresses
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages.length, loading, isOpen, scrollToBottom]);

  // Synchronize quick replies horizontal scroll indicators on desktop & mobile
  useEffect(() => {
    if (isOpen && messages.length > 0 && !loading) {
      const timer = setTimeout(updateQuickRepliesScroll, 60);
      window.addEventListener("resize", updateQuickRepliesScroll);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("resize", updateQuickRepliesScroll);
      };
    }
  }, [isOpen, messages.length, loading, lang, updateQuickRepliesScroll]);

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
      {/* Floating Chatbot Button — Draggable launcher with reliable mobile touch & desktop click */}
      {!hideLauncher && (
        <div
          ref={triggerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onClick={handleButtonClick}
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
          className={`fixed z-30 ${isOpen ? "hidden sm:flex" : "flex"} h-14 w-14 items-center justify-center select-none ${
            position
              ? ""
              : "bottom-24 right-4 md:bottom-6 md:right-6"
          } ${isDragging ? "cursor-grabbing scale-105" : "cursor-grab"} ${
            isExternalModalOpen
              ? "pointer-events-none opacity-40 transition-opacity duration-200"
              : "touch-none"
          }`}
        >
          {/* Ambient looping light pulse behind the floating icon — suppressed when a modal is open */}
          {!isExternalModalOpen && (
            <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
              <div
                className="h-14 w-14 rounded-full bg-blue-500/35 dark:bg-cyan-400/40 blur-md chatbot-pulse-glow"
                aria-hidden="true"
              />
            </div>
          )}

          <button
            type="button"
            onClick={handleButtonClick}
            disabled={isExternalModalOpen}
            tabIndex={isExternalModalOpen ? -1 : 0}
            className={`relative flex h-14 w-14 min-h-14 min-w-14 items-center justify-center rounded-2xl border border-ui-border/80 dark:border-white/20 bg-ui-surface dark:bg-[#0c1b30] text-ui-foreground dark:text-white shadow-xl hover:shadow-2xl dark:shadow-slate-950/70 hover:bg-ui-muted dark:hover:bg-[#132f4d] ${
              isDragging
                ? "ring-4 ring-ui-primary/35"
                : "active:scale-95 transition-transform duration-150"
            } focus:outline-none focus:ring-4 focus:ring-blue-400/40 disabled:cursor-not-allowed`}
            aria-label={isOpen ? `Close ${BRAND.assistantName}` : `Chat with ${BRAND.assistantName}`}
            title={isOpen ? `Close ${BRAND.assistantName}` : `Chat with ${BRAND.assistantName}`}
            aria-expanded={isOpen}
            aria-controls="iqueue-chatbot-panel"
          >
            {isOpen ? (
              <X className="h-6 w-6 pointer-events-none" />
            ) : (
              <MessageCircle className="h-6 w-6 pointer-events-none text-ui-primary dark:text-cyan-400" />
            )}
          </button>
        </div>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          id="iqueue-chatbot-panel"
          role="dialog"
          aria-modal="true"
          aria-label={UI_STRINGS[lang].title}
          data-lenis-prevent
          style={{ boxShadow: "0 20px 45px -10px rgba(0, 0, 0, 0.35)" }}
          className="fixed inset-0 z-[70] flex h-dvh max-h-dvh w-full flex-col overflow-hidden bg-ui-surface text-ui-foreground touch-auto
                     sm:inset-auto sm:bottom-6 sm:right-6 sm:left-auto
                     sm:h-[min(80dvh,620px)] sm:max-h-[calc(100dvh-4.5rem)] sm:w-[26.5rem]
                     sm:rounded-3xl sm:border sm:border-ui-border sm:shadow-2xl sm:shadow-slate-950/20 dark:sm:shadow-slate-950/60"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-ui-border/70 bg-ui-surface px-4 sm:px-5 pb-3 sm:pb-3.5 pt-[max(1.25rem,calc(env(safe-area-inset-top,0px)+0.75rem))] sm:pt-4 text-ui-foreground dark:border-white/10 dark:bg-ui-navy dark:text-white">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-ui-primary/10 text-ui-primary dark:bg-cyan-500/20 dark:text-cyan-300">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg leading-tight">{UI_STRINGS[lang].title}</h3>
                <p className="text-xs text-ui-muted-foreground dark:text-slate-300">{UI_STRINGS[lang].subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close assistant"
              className="flex h-11 w-11 min-h-[44px] min-w-[44px] sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0 items-center justify-center rounded-xl border border-ui-border/80 dark:border-white/15 hover:bg-ui-muted dark:hover:bg-white/15 text-ui-muted-foreground hover:text-ui-foreground active:scale-95 transition-all"
            >
              <X className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Language Selector */}
          <div
            onWheel={(e) => {
              if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY;
            }}
            className="flex shrink-0 items-center gap-1.5 border-b border-ui-border/70 bg-ui-muted/30 dark:bg-white/[0.02] px-3.5 sm:px-5 py-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {LANGUAGES.map((l) => (
              <button
                type="button"
                key={l.code}
                onClick={() => handleLanguageChange(l.code)}
                className={`flex min-h-[32px] sm:min-h-[34px] items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-semibold select-none transition-[background-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.97] ${
                  lang === l.code
                    ? "bg-ui-primary text-white shadow-sm shadow-ui-primary/25 dark:text-ui-navy"
                    : "text-ui-muted-foreground hover:bg-ui-muted hover:text-ui-foreground"
                }`}
                title={l.label}
              >
                <span>{l.label}</span>
              </button>
            ))}
          </div>

          {/* Messages */}
          <div
            data-lenis-prevent
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3.5 sm:space-y-4 touch-auto"
            style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[82%] rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-sm leading-relaxed shadow-xs ${
                    msg.role === "user"
                      ? "bg-ui-primary text-white dark:text-ui-navy"
                      : "bg-ui-muted/80 text-ui-foreground dark:bg-slate-800/90 dark:text-slate-100 border border-ui-border/50 dark:border-white/10"
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
                      <div className="mt-2.5 sm:mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                        {actionItems.map((action, ai) => (
                          <button
                            type="button"
                            key={ai}
                            onClick={() => handleSuggestionClick(action)}
                            disabled={loading}
                            className="text-xs bg-ui-surface dark:bg-slate-900/90
                                       text-ui-primary dark:text-cyan-300
                                       border border-ui-primary/30 dark:border-cyan-400/30
                                       rounded-full px-3 py-1.5 font-medium
                                       hover:bg-ui-primary hover:text-white
                                       dark:hover:bg-cyan-500 dark:hover:text-slate-950
                                       disabled:opacity-50 disabled:cursor-not-allowed
                                       select-none transition-all duration-150 active:scale-[0.96] shadow-xs"
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
              <div className="flex items-center gap-2 px-2 text-sm text-ui-muted-foreground" aria-label="Assistant is typing">
                <span className="h-2 w-2 animate-bounce rounded-full bg-ui-primary motion-reduce:animate-none [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-ui-primary motion-reduce:animate-none [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-ui-primary motion-reduce:animate-none [animation-delay:300ms]" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick reply buttons */}
          {messages.length > 0 && !loading && (
            <div className="relative flex shrink-0 items-center border-t border-ui-border/70 bg-ui-surface-soft/60 dark:bg-white/[0.02]">
              {canScrollLeft && (
                <button
                  type="button"
                  onClick={() => quickRepliesRef.current?.scrollBy({ left: -140, behavior: "smooth" })}
                  className="hidden sm:flex absolute left-1.5 z-10 h-7 w-7 items-center justify-center rounded-full bg-ui-surface/95 dark:bg-slate-800 border border-ui-border shadow-md text-ui-muted-foreground hover:text-ui-foreground transition-transform active:scale-90"
                  aria-label="Scroll options left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              <div
                ref={quickRepliesRef}
                onScroll={updateQuickRepliesScroll}
                onWheel={(e) => {
                  if (e.deltaY !== 0) {
                    e.currentTarget.scrollLeft += e.deltaY;
                    updateQuickRepliesScroll();
                  }
                }}
                className="flex w-full gap-2 overflow-x-auto px-3.5 py-2.5 sm:px-5 sm:py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
              >
                {QUICK_REPLIES[lang].map((reply, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => handleSuggestionClick(reply)}
                    className="flex min-h-9 sm:min-h-9 shrink-0 items-center rounded-full border border-ui-border bg-ui-surface px-3.5 py-1.5 sm:px-4 text-xs font-medium text-ui-muted-foreground hover:border-ui-primary/50 hover:bg-ui-surface hover:text-ui-foreground select-none transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.96] shadow-xs"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              {canScrollRight && (
                <button
                  type="button"
                  onClick={() => quickRepliesRef.current?.scrollBy({ left: 140, behavior: "smooth" })}
                  className="hidden sm:flex absolute right-1.5 z-10 h-7 w-7 items-center justify-center rounded-full bg-ui-surface/95 dark:bg-slate-800 border border-ui-border shadow-md text-ui-muted-foreground hover:text-ui-foreground transition-transform active:scale-90"
                  aria-label="Scroll options right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Input */}
          <div className="flex shrink-0 gap-2.5 border-t border-ui-border/80 bg-ui-surface px-3.5 pt-3 pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+0.85rem))] sm:p-4 dark:bg-ui-navy">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={UI_STRINGS[lang].placeholder}
              disabled={loading}
              className="clay-control min-h-11 sm:min-h-12 flex-1 rounded-xl border border-ui-border bg-ui-surface px-3.5 py-2.5 sm:px-4 text-sm sm:text-base text-ui-foreground placeholder:text-ui-muted-foreground focus:border-ui-primary focus:ring-2 focus:ring-ui-primary/20 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="clay-action bg-ui-primary text-white dark:text-ui-navy min-h-[44px] min-w-[44px] sm:min-h-12 sm:min-w-12 rounded-xl flex items-center justify-center p-2.5
                         hover:bg-ui-primary-hover
                         disabled:bg-ui-muted disabled:text-ui-muted-foreground
                         disabled:cursor-not-allowed transition-colors shrink-0"
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
