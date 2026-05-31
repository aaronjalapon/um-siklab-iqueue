"use client";

import { useState } from "react";
import { sendChatMessage } from "@/lib/api";
import type { ChatbotResponse } from "@/lib/types";
import { LANGUAGE_LABELS } from "@/lib/utils";
import { MessageCircle, Send, X } from "lucide-react";

interface Message {
  role: "user" | "bot";
  text: string;
  language?: string;
  intent?: string;
}

interface ChatbotPanelProps {
  bookingId?: string;
}

export default function ChatbotPanel({ bookingId }: ChatbotPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "Hi! I'm the IQueue assistant. I can help you check your booking, find departure info, or answer questions about surge crowds. How can I help?",
      intent: "greeting",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

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
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: response.response_text,
          language: response.detected_language,
          intent: response.intent,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Sorry, I'm having trouble connecting. Please try again later.",
          intent: "error",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-blue-700 text-white p-4 rounded-full shadow-lg hover:bg-blue-800 transition z-50"
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
        <div className="fixed bottom-24 right-0 left-0 mx-4 sm:mx-auto sm:right-6 sm:left-auto w-auto sm:w-96 h-[70vh] max-h-[500px] bg-white rounded-xl shadow-2xl border flex flex-col z-50">
          {/* Header */}
          <div className="bg-blue-700 text-white p-4 rounded-t-xl flex items-center justify-between">
            <div>
              <h3 className="font-semibold">IQueue Assistant</h3>
              <p className="text-xs text-blue-200">
                AI-powered chatbot · 4 languages
              </p>
            </div>
            <button onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </button>
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
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p>{msg.text}</p>
                  {msg.language && (
                    <span className="text-xs opacity-70 mt-1 block">
                      {LANGUAGE_LABELS[msg.language] || msg.language}
                      {msg.intent && msg.intent !== "fallback" && (
                        <> · {msg.intent.replace(/_/g, " ")}</>
                      )}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-center text-gray-400 text-sm">
                Thinking...
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-3 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your question..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-blue-700 text-white p-2 rounded-lg hover:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
