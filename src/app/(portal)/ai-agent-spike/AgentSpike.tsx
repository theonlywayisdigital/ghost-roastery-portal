"use client";

import { useState, useRef, useCallback } from "react";
import {
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Sparkles,
} from "@/components/icons";

// ── Types ──

interface ToolResult {
  tool: string;
  action: "CREATE" | "UPDATE" | "READ";
  summary: string;
  target?: string;
  diff?: Record<string, { before: unknown; after: unknown }>;
  data?: unknown[];
}

type Phase = "input" | "planning" | "review" | "executing" | "done";

interface ExecutionItem {
  label: string;
  status: "pending" | "running" | "done";
}

const EXAMPLE_PROMPTS = [
  "Increase all product prices by 1.5% rounded to the nearest 0.50",
  "Show me all contacts added in the last 7 days",
  "Create a draft order for my first contact for the cheapest product",
];

// ── Component ──

export function AgentSpike() {
  const [phase, setPhase] = useState<Phase>("input");
  const [prompt, setPrompt] = useState("");
  const [cards, setCards] = useState<ToolResult[]>([]);
  const [aiMessage, setAiMessage] = useState("");
  const [executionItems, setExecutionItems] = useState<ExecutionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSend = useCallback(
    async (text?: string) => {
      const message = text || prompt;
      if (!message.trim()) return;

      setPhase("planning");
      setCards([]);
      setAiMessage("");
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/ai-agent-spike", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Request failed" }));
          setError(err.error || "Request failed");
          setPhase("input");
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setError("No response stream");
          setPhase("input");
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7);
            } else if (line.startsWith("data: ") && eventType) {
              try {
                const data = JSON.parse(line.slice(6));

                switch (eventType) {
                  case "tool_result":
                    setCards((prev) => [...prev, data as ToolResult]);
                    break;
                  case "message":
                    setAiMessage(data.text || "");
                    break;
                  case "error":
                    setError(data.error || "An error occurred");
                    break;
                  case "done":
                    break;
                }
              } catch {
                // skip malformed data
              }
              eventType = "";
            }
          }
        }

        setPhase("review");
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
        setPhase("input");
      }
    },
    [prompt]
  );

  function handleCancel() {
    abortRef.current?.abort();
    setPhase("input");
    setCards([]);
    setAiMessage("");
    setError(null);
  }

  function handleAcceptAll() {
    // SPIKE MODE: simulate execution
    const updateCards = cards.filter((c) => c.action === "UPDATE");
    if (updateCards.length === 0) {
      // Nothing to execute — just show done
      setPhase("done");
      return;
    }

    const items: ExecutionItem[] = updateCards.map((c) => ({
      label: c.target || c.summary,
      status: "pending" as const,
    }));
    setExecutionItems(items);
    setPhase("executing");

    // Simulate sequential execution
    let i = 0;
    const tick = () => {
      if (i >= items.length) {
        setPhase("done");
        return;
      }
      setExecutionItems((prev) =>
        prev.map((item, idx) =>
          idx === i
            ? { ...item, status: "running" }
            : idx < i
              ? { ...item, status: "done" }
              : item
        )
      );
      i++;
      setTimeout(tick, 600);
    };
    tick();
  }

  function handleReset() {
    setPhase("input");
    setPrompt("");
    setCards([]);
    setAiMessage("");
    setError(null);
    setExecutionItems([]);
  }

  const updateCount = cards.filter((c) => c.action === "UPDATE").length;
  const readCount = cards.filter((c) => c.action === "READ").length;
  const totalChanges = updateCount;

  return (
    <div className="max-w-3xl mx-auto">
      {/* ── INPUT PHASE ── */}
      {phase === "input" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Tell me what you'd like to do..."
              className="w-full h-32 resize-none border-0 text-slate-900 placeholder:text-slate-400 focus:ring-0 text-base"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSend();
                }
              }}
            />
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => handleSend()}
                disabled={!prompt.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
              Try an example
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex}
                  onClick={() => {
                    setPrompt(ex);
                    handleSend(ex);
                  }}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* ── PLANNING PHASE ── */}
      {phase === "planning" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
            <span className="text-sm text-slate-700">
              Thinking and gathering data...
            </span>
          </div>

          {cards.length > 0 && (
            <div className="space-y-3">
              {cards.map((card, i) => (
                <ActionCard key={i} card={card} />
              ))}
            </div>
          )}

          <button
            onClick={handleCancel}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── REVIEW PHASE ── */}
      {phase === "review" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-1">
              <Sparkles className="w-5 h-5 text-brand-600" />
              <h2 className="text-lg font-semibold text-slate-900">
                {totalChanges > 0
                  ? `Here's what I'll do`
                  : "Here's what I found"}
              </h2>
            </div>
            {totalChanges > 0 && (
              <p className="text-sm text-slate-500 ml-8">
                {totalChanges} proposed{" "}
                {totalChanges === 1 ? "change" : "changes"}
                {readCount > 0 ? ` (${readCount} data lookups)` : ""}
              </p>
            )}
            {aiMessage && (
              <p className="text-sm text-slate-700 mt-3 ml-8">{aiMessage}</p>
            )}
          </div>

          <div className="space-y-3">
            {cards.map((card, i) => (
              <ActionCard key={i} card={card} />
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            {totalChanges > 0 && (
              <button
                onClick={handleAcceptAll}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Accept All
              </button>
            )}
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {totalChanges > 0 ? "Cancel" : "Back"}
            </button>
          </div>
        </div>
      )}

      {/* ── EXECUTING PHASE ── */}
      {phase === "executing" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Applying changes...
            </h2>
            <div className="space-y-3">
              {executionItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  {item.status === "pending" && (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
                  )}
                  {item.status === "running" && (
                    <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
                  )}
                  {item.status === "done" && (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                  <span
                    className={`text-sm ${
                      item.status === "done"
                        ? "text-slate-500"
                        : "text-slate-900"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── DONE PHASE ── */}
      {phase === "done" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              {totalChanges > 0
                ? `${totalChanges} ${totalChanges === 1 ? "change" : "changes"} applied successfully.`
                : "Done."}
            </h2>
            <p className="text-sm text-slate-500">
              {totalChanges > 0
                ? "SPIKE MODE: No actual database writes were made."
                : ""}
            </p>
          </div>

          {cards.length > 0 && (
            <div className="space-y-3">
              {cards.map((card, i) => (
                <ActionCard key={i} card={card} />
              ))}
            </div>
          )}

          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Start over
          </button>
        </div>
      )}
    </div>
  );
}

// ── Action Card ──

const BORDER_COLORS: Record<string, string> = {
  CREATE: "border-l-green-500",
  UPDATE: "border-l-amber-500",
  READ: "border-l-blue-500",
};

const BADGE_COLORS: Record<string, string> = {
  CREATE: "bg-green-50 text-green-700",
  UPDATE: "bg-amber-50 text-amber-700",
  READ: "bg-blue-50 text-blue-700",
};

function ActionCard({ card }: { card: ToolResult }) {
  const borderColor = BORDER_COLORS[card.action] || "border-l-slate-300";
  const badgeColor = BADGE_COLORS[card.action] || "bg-slate-50 text-slate-700";

  return (
    <div
      className={`bg-white rounded-lg border border-slate-200 border-l-4 ${borderColor} p-4`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${badgeColor}`}
            >
              {card.action}
            </span>
            <span className="text-sm font-medium text-slate-900 truncate">
              {card.target || card.summary}
            </span>
          </div>

          {/* Diff display */}
          {card.diff && (
            <div className="mt-2 space-y-1">
              {Object.entries(card.diff).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500 min-w-[100px]">
                    {key.replace(/_/g, " ")}:
                  </span>
                  <span className="text-slate-400 line-through">
                    {formatValue(val.before)}
                  </span>
                  <span className="text-slate-400">&rarr;</span>
                  <span className="text-slate-900 font-medium">
                    {formatValue(val.after)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Data display for READ actions */}
          {card.action === "READ" && card.data && (
            <p className="text-xs text-slate-500 mt-1">
              {card.data.length} {card.data.length === 1 ? "record" : "records"}{" "}
              found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "number") {
    return `£${val.toFixed(2)}`;
  }
  return String(val);
}
