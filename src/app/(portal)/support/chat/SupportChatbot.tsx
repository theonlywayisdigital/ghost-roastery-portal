"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, LifeBuoy } from "@/components/icons";
import type { ChatMessage } from "@/types/support";

interface Props {
  onEscalate: (messages: ChatMessage[]) => void;
}

export function SupportChatbot({ onEscalate }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [suggestTicket, setSuggestTicket] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages,
          conversationId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: data.response,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        if (data.conversationId) setConversationId(data.conversationId);
        if (data.suggest_ticket) setSuggestTicket(true);
      } else {
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content:
            "Sorry, I encountered an error. Please try again or create a support ticket.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch {
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content:
          "Sorry, I couldn't connect. Please try again or create a support ticket.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }

    setSending(false);
  };

  const handleEscalate = () => {
    onEscalate(messages);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 flex flex-col" style={{ height: "500px" }}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-brand-50">
          <Bot className="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            AI Support Assistant
          </h3>
          <p className="text-xs text-slate-400">
            Ask me anything about Ghost Roastery
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              Hi! I can help with questions about orders, billing, your
              account, and more. What do you need help with?
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="p-1.5 rounded-lg bg-brand-50 self-start flex-shrink-0">
                <Bot className="w-4 h-4 text-brand-600" />
              </div>
            )}
            <div
              className={`max-w-[80%] px-4 py-3 rounded-xl text-sm ${
                msg.role === "user"
                  ? "bg-brand-600 text-white rounded-br-sm"
                  : "bg-slate-100 text-slate-700 rounded-bl-sm"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.role === "user" && (
              <div className="p-1.5 rounded-lg bg-slate-100 self-start flex-shrink-0">
                <User className="w-4 h-4 text-slate-500" />
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex gap-3">
            <div className="p-1.5 rounded-lg bg-brand-50 self-start">
              <Bot className="w-4 h-4 text-brand-600" />
            </div>
            <div className="px-4 py-3 rounded-xl bg-slate-100 rounded-bl-sm">
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Escalation banner */}
      {suggestTicket && (
        <div className="px-6 py-3 bg-amber-50 border-t border-amber-200">
          <div className="flex items-center gap-3">
            <LifeBuoy className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700 flex-1">
              It looks like you might need human assistance.
            </p>
            <button
              onClick={handleEscalate}
              className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 whitespace-nowrap"
            >
              Create Ticket
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-6 py-4 border-t border-slate-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            className="px-4 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
