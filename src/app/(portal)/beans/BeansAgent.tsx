"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  AlertTriangle,
  Copy,
  Play,
  ChevronDown,
  ChevronUp,
} from "@/components/icons";

// ── Types ──

interface ActionDiff {
  field: string;
  from: unknown;
  to: unknown;
}

interface PlannedAction {
  id: string;
  domain: string;
  action: string;
  label: string;
  type: "CREATE" | "UPDATE" | "DELETE" | "READ";
  destructive: boolean;
  endpoint: string;
  method: string;
  body: Record<string, unknown>;
  dependsOn: string[];
  conflictsWith: string[];
  diff: ActionDiff[];
}

interface Chip {
  label: string;
  value: string;
}

interface ChatMessage {
  role: "user" | "model";
  content: string;
  chips?: Chip[];
}

type Phase = "input" | "conversation" | "planning" | "review" | "executing" | "done";

interface ExecutionStatus {
  actionId: string;
  status: "pending" | "running" | "done" | "failed";
  error?: string;
}

const EXAMPLE_PROMPTS = [
  "Increase all product prices by 1.5% to nearest £0.50",
  "Create a draft order for my most recent contact for the cheapest product",
  "Approve all pending wholesale buyers",
  "Create a 10% discount code valid for 7 days",
  "Add a note to all contacts from this week saying 'Follow up required'",
  "Show me all overdue invoices",
];

const DOMAIN_LABELS: Record<string, string> = {
  products: "Product",
  contacts: "Contact",
  orders: "Order",
  invoices: "Invoice",
  wholesale_buyers: "Wholesale Buyer",
  green_beans: "Green Bean",
  roasted_stock: "Roasted Stock",
  production: "Production Plan",
  discount_codes: "Discount Code",
};

// ── Helpers ──

function parseChips(text: string): { clean: string; chips: Chip[] } {
  const idx = text.lastIndexOf("CHIPS:[");
  if (idx === -1) return { clean: text, chips: [] };

  const clean = text.slice(0, idx).trimEnd();
  const jsonStr = text.slice(idx + 6); // everything after "CHIPS:"
  try {
    const chips = JSON.parse(jsonStr) as Chip[];
    if (!Array.isArray(chips)) return { clean, chips: [] };
    return { clean, chips };
  } catch {
    return { clean, chips: [] };
  }
}

// ── Component ──

export function BeansAgent() {
  const [phase, setPhase] = useState<Phase>("input");
  const [prompt, setPrompt] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [actions, setActions] = useState<PlannedAction[]>([]);
  const [summary, setSummary] = useState("");
  const [toolCalls, setToolCalls] = useState<string[]>([]);
  const [executionStatuses, setExecutionStatuses] = useState<
    Map<string, ExecutionStatus>
  >(new Map());
  const [completionStats, setCompletionStats] = useState<{
    total: number;
    completed: number;
    failed: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [readLookupsOpen, setReadLookupsOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Focus chat input when conversation phase starts
  useEffect(() => {
    if (phase === "conversation" && !isThinking) {
      chatInputRef.current?.focus();
    }
  }, [phase, isThinking]);

  // ── Send message to plan API ──

  const sendMessage = useCallback(
    async (text: string, currentMessages: ChatMessage[]) => {
      if (!text.trim()) return;

      // Add user message to chat
      const userMsg: ChatMessage = { role: "user", content: text };
      const updatedMessages = [...currentMessages, userMsg];
      setMessages(updatedMessages);
      setIsThinking(true);
      setError(null);
      setToolCalls([]);

      const controller = new AbortController();
      abortRef.current = controller;

      // Build history for API (exclude chips metadata)
      const history = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const res = await fetch("/api/beans/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            history: history.slice(0, -1), // Don't duplicate the current message
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Request failed" }));
          setError(err.error || "Request failed");
          setIsThinking(false);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setError("No response stream");
          setIsThinking(false);
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let receivedActions: PlannedAction[] = [];
        let receivedSummary = "";
        let receivedMessage = "";

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
                  case "action":
                    receivedActions = [...receivedActions, data as PlannedAction];
                    break;
                  case "tool_call":
                    setToolCalls((prev) => [...prev, data.summary]);
                    break;
                  case "summary":
                    receivedSummary = data.text || "";
                    break;
                  case "message":
                    receivedMessage = data.text || "";
                    break;
                  case "error":
                    setError(data.error || "An error occurred");
                    break;
                  case "done":
                    break;
                }
              } catch {
                // Skip malformed data
              }
              eventType = "";
            }
          }
        }

        setIsThinking(false);

        // Decide what to do with the response
        if (receivedActions.length > 0) {
          // Beans returned a plan — transition to review
          setActions(receivedActions);
          setSummary(receivedSummary);
          setPhase("review");
        } else if (receivedMessage) {
          // Beans sent a conversational message — stay in conversation
          const { clean, chips } = parseChips(receivedMessage);
          const modelMsg: ChatMessage = {
            role: "model",
            content: clean,
            chips: chips.length > 0 ? chips : undefined,
          };
          setMessages((prev) => [...prev, modelMsg]);
          setPhase("conversation");
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
        setIsThinking(false);
      }
    },
    []
  );

  // ── Handlers ──

  const handleInitialSend = useCallback(
    (text?: string) => {
      const msg = text || prompt;
      if (!msg.trim()) return;
      setPhase("conversation");
      sendMessage(msg, []);
    },
    [prompt, sendMessage]
  );

  const handleChatSend = useCallback(() => {
    if (!chatInput.trim() || isThinking) return;
    const text = chatInput;
    setChatInput("");
    sendMessage(text, messages);
  }, [chatInput, isThinking, messages, sendMessage]);

  const handleChipClick = useCallback(
    (chip: Chip) => {
      if (isThinking) return;
      sendMessage(chip.value, messages);
    },
    [isThinking, messages, sendMessage]
  );

  // ── Execute ──

  const handleExecute = useCallback(async () => {
    const executableActions = actions.filter(
      (a) =>
        a.type !== "READ" &&
        (!a.conflictsWith || a.conflictsWith.length === 0) &&
        a.endpoint &&
        a.method
    );

    if (executableActions.length === 0) {
      setPhase("done");
      setCompletionStats({ total: 0, completed: 0, failed: 0 });
      return;
    }

    const initialStatuses = new Map<string, ExecutionStatus>();
    for (const action of executableActions) {
      initialStatuses.set(action.id, {
        actionId: action.id,
        status: "pending",
      });
    }
    setExecutionStatuses(initialStatuses);
    setPhase("executing");

    try {
      const res = await fetch("/api/beans/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: executableActions }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Execution failed" }));
        setError(err.error || "Execution failed");
        setPhase("done");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("No execution stream");
        setPhase("done");
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
                case "progress":
                  setExecutionStatuses((prev) => {
                    const next = new Map(prev);
                    next.set(data.actionId, {
                      actionId: data.actionId,
                      status: data.status,
                      error: data.error,
                    });
                    return next;
                  });
                  break;
                case "complete":
                  setCompletionStats({
                    total: data.total,
                    completed: data.completed,
                    failed: data.failed,
                  });
                  break;
                case "error":
                  setError(data.error || "Execution error");
                  break;
              }
            } catch {
              // Skip malformed
            }
            eventType = "";
          }
        }
      }

      setPhase("done");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setPhase("done");
    }
  }, [actions]);

  // ── Navigation ──

  function handleCancel() {
    abortRef.current?.abort();
    setPhase("input");
    setPrompt("");
    setChatInput("");
    setMessages([]);
    setActions([]);
    setSummary("");
    setToolCalls([]);
    setError(null);
    setIsThinking(false);
    setReadLookupsOpen(false);
  }

  function handleBackToChat() {
    setActions([]);
    setSummary("");
    setPhase("conversation");
  }

  function handleReset() {
    setPhase("input");
    setPrompt("");
    setChatInput("");
    setMessages([]);
    setActions([]);
    setSummary("");
    setToolCalls([]);
    setError(null);
    setExecutionStatuses(new Map());
    setCompletionStats(null);
    setIsThinking(false);
    setReadLookupsOpen(false);
  }

  function copySummary() {
    const lines = actions
      .filter((a) => a.type !== "READ")
      .map(
        (a) =>
          `${a.destructive ? "⚠️" : "✅"} ${a.label}`
      );
    if (completionStats) {
      lines.unshift(
        `Beans: ${completionStats.completed} of ${completionStats.total} actions completed.`
      );
    }
    navigator.clipboard.writeText(lines.join("\n"));
  }

  const writeActions = actions.filter((a) => a.type !== "READ");
  const readActions = actions.filter((a) => a.type === "READ");
  const conflictCount = actions.filter(
    (a) => a.conflictsWith && a.conflictsWith.length > 0
  ).length;
  const executableCount = writeActions.filter(
    (a) => !a.conflictsWith || a.conflictsWith.length === 0
  ).length;
  const createCount = writeActions.filter((a) => a.type === "CREATE").length;
  const updateCount = writeActions.filter((a) => a.type === "UPDATE").length;
  const deleteCount = writeActions.filter((a) => a.type === "DELETE").length;

  // Execution progress
  const execTotal = Array.from(executionStatuses.values()).length;
  const execDone = Array.from(executionStatuses.values()).filter(
    (s) => s.status === "done" || s.status === "failed"
  ).length;

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* ── INPUT ── */}
      {phase === "input" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Tell Beans what to do..."
              className="w-full h-32 resize-none border-0 text-slate-900 placeholder:text-slate-400 focus:ring-0 text-base"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleInitialSend();
                }
              }}
            />
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => handleInitialSend()}
                disabled={!prompt.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex}
                  onClick={() => {
                    setPrompt(ex);
                    handleInitialSend(ex);
                  }}
                  className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left leading-snug"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {error && <ErrorBanner error={error} />}
        </div>
      )}

      {/* ── CONVERSATION ── */}
      {phase === "conversation" && (
        <div className="flex flex-col h-[calc(100vh-220px)]">
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pb-4">
            {messages.map((msg, i) => (
              <div key={i}>
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-slate-800 text-white rounded-2xl rounded-br-md px-4 py-3">
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 items-start">
                    {/* Bean avatar */}
                    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-4 h-4 text-amber-700"
                        fill="currentColor"
                      >
                        <ellipse cx="12" cy="12" rx="5" ry="8" transform="rotate(-30 12 12)" opacity="0.6" />
                        <ellipse cx="12" cy="12" rx="5" ry="8" transform="rotate(30 12 12)" opacity="0.6" />
                      </svg>
                    </div>
                    <div className="max-w-[80%]">
                      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3">
                        <p className="text-sm text-slate-800 whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      </div>
                      {/* Chips */}
                      {msg.chips && msg.chips.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2 ml-1">
                          {msg.chips.map((chip, ci) => (
                            <button
                              key={ci}
                              onClick={() => handleChipClick(chip)}
                              disabled={isThinking}
                              className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-sm text-amber-800 font-medium hover:bg-amber-100 hover:border-amber-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {chip.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Thinking indicator */}
            {isThinking && (
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4 text-amber-700"
                    fill="currentColor"
                  >
                    <ellipse cx="12" cy="12" rx="5" ry="8" transform="rotate(-30 12 12)" opacity="0.6" />
                    <ellipse cx="12" cy="12" rx="5" ry="8" transform="rotate(30 12 12)" opacity="0.6" />
                  </svg>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                    <span className="text-sm text-slate-500">
                      {toolCalls.length > 0
                        ? toolCalls[toolCalls.length - 1]
                        : "Thinking..."}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-3">
              <ErrorBanner error={error} />
            </div>
          )}

          {/* Chat input bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex gap-2">
            <button
              onClick={handleCancel}
              className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0"
              title="Cancel"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <input
              ref={chatInputRef}
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Reply to Beans..."
              className="flex-1 border-0 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-0 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleChatSend();
              }}
              disabled={isThinking}
            />
            <button
              onClick={handleChatSend}
              disabled={!chatInput.trim() || isThinking}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── REVIEW ── */}
      {phase === "review" && (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              Beans has a plan
            </h2>
            {writeActions.length > 0 && (
              <p className="text-sm text-slate-500">
                {writeActions.length}{" "}
                {writeActions.length === 1 ? "action" : "actions"}
                {createCount > 0 || updateCount > 0 || deleteCount > 0
                  ? " — "
                  : ""}
                {[
                  createCount > 0
                    ? `${createCount} ${createCount === 1 ? "create" : "creates"}`
                    : "",
                  updateCount > 0
                    ? `${updateCount} ${updateCount === 1 ? "update" : "updates"}`
                    : "",
                  deleteCount > 0
                    ? `${deleteCount} ${deleteCount === 1 ? "delete" : "deletes"}`
                    : "",
                ]
                  .filter(Boolean)
                  .join(", ")}
                {readActions.length > 0
                  ? `, ${readActions.length} ${readActions.length === 1 ? "lookup" : "lookups"}`
                  : ""}
              </p>
            )}
            {summary && (
              <p className="text-sm text-slate-700 mt-2">{summary}</p>
            )}
          </div>

          {/* Conflict warning */}
          {conflictCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                {conflictCount} {conflictCount === 1 ? "action" : "actions"}{" "}
                skipped due to conflicts.
              </p>
            </div>
          )}

          {/* Write action cards */}
          {writeActions.length > 0 && (
            <div className="space-y-3">
              {writeActions.map((action) => (
                <ActionCard key={action.id} action={action} />
              ))}
            </div>
          )}

          {/* Read lookups — collapsible */}
          {readActions.length > 0 && (
            <div>
              <button
                onClick={() => setReadLookupsOpen(!readLookupsOpen)}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors w-full py-2"
              >
                {readLookupsOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                Data lookups ({readActions.length})
              </button>
              {readLookupsOpen && (
                <div className="space-y-2 mt-1">
                  {readActions.map((action) => (
                    <ReadCard key={action.id} action={action} />
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <ErrorBanner error={error} />}

          {/* Sticky footer */}
          <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-slate-200 px-6 py-4 z-10">
            <div className="max-w-3xl mx-auto flex items-center justify-between">
              <button
                onClick={handleBackToChat}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              {executableCount > 0 && (
                <button
                  onClick={handleExecute}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Accept &amp; Run {executableCount}{" "}
                  {executableCount === 1 ? "action" : "actions"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── EXECUTING ── */}
      {phase === "executing" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-slate-900">
                Running actions...
              </h2>
              <span className="text-sm text-slate-500">
                {execDone} of {execTotal}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-5">
              <div
                className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: execTotal > 0 ? `${(execDone / execTotal) * 100}%` : "0%",
                }}
              />
            </div>

            <div className="space-y-3">
              {actions
                .filter(
                  (a) =>
                    a.type !== "READ" &&
                    (!a.conflictsWith || a.conflictsWith.length === 0)
                )
                .map((action) => {
                  const status = executionStatuses.get(action.id);
                  const domainLabel = DOMAIN_LABELS[action.domain] || action.domain;
                  const badgeStyle =
                    BADGE_STYLES[action.type] || "bg-slate-50 text-slate-700";

                  return (
                    <div
                      key={action.id}
                      className={`flex items-start gap-3 p-3 rounded-lg ${
                        status?.status === "failed"
                          ? "bg-red-50"
                          : status?.status === "done"
                            ? "bg-slate-50"
                            : ""
                      }`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {(!status || status.status === "pending") && (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
                        )}
                        {status?.status === "running" && (
                          <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                        )}
                        {status?.status === "done" && (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        )}
                        {status?.status === "failed" && (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${badgeStyle}`}
                          >
                            {action.type}
                          </span>
                          <span className="text-xs text-slate-400">
                            {domainLabel}
                          </span>
                        </div>
                        <p
                          className={`text-sm mt-0.5 ${
                            status?.status === "done"
                              ? "text-slate-500"
                              : status?.status === "failed"
                                ? "text-red-700"
                                : "text-slate-900"
                          }`}
                        >
                          {extractTitle(action)}
                        </p>
                        {status?.status === "failed" && status.error && (
                          <p className="text-xs text-red-500 mt-1">
                            {status.error}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ── DONE ── */}
      {phase === "done" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
            {completionStats && completionStats.failed === 0 ? (
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
            ) : completionStats && completionStats.failed > 0 ? (
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            ) : (
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
            )}

            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              {completionStats
                ? `${completionStats.completed} of ${completionStats.total} actions completed`
                : "Done"}
            </h2>

            {completionStats && completionStats.failed > 0 && (
              <p className="text-sm text-red-600 mt-1">
                {completionStats.failed}{" "}
                {completionStats.failed === 1 ? "action" : "actions"} failed
              </p>
            )}
          </div>

          {/* Failed actions detail */}
          {Array.from(executionStatuses.values()).some(
            (s) => s.status === "failed"
          ) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-red-800 mb-2">
                Failed actions
              </h3>
              <div className="space-y-2">
                {Array.from(executionStatuses.values())
                  .filter((s) => s.status === "failed")
                  .map((s) => {
                    const action = actions.find((a) => a.id === s.actionId);
                    return (
                      <div key={s.actionId} className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-red-700">
                            {action ? extractTitle(action) : s.actionId}
                          </p>
                          {s.error && (
                            <p className="text-xs text-red-500">{s.error}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Completed action cards */}
          {writeActions.length > 0 && (
            <div className="space-y-3">
              {writeActions.map((action) => (
                <ActionCard key={action.id} action={action} />
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Start over
            </button>
            <button
              onClick={copySummary}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy summary
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──

function extractTitle(action: PlannedAction): string {
  const dashIdx = action.label.indexOf(" — assumed");
  if (dashIdx > 0) return action.label.slice(0, dashIdx);
  return action.label;
}

function extractAssumption(action: PlannedAction): string | null {
  const dashIdx = action.label.indexOf(" — assumed");
  if (dashIdx > 0) return action.label.slice(dashIdx + 3);
  return null;
}

const BORDER_COLORS: Record<string, string> = {
  CREATE: "border-l-green-500",
  UPDATE: "border-l-amber-500",
  READ: "border-l-blue-500",
  DELETE: "border-l-red-500",
};

const BADGE_STYLES: Record<string, string> = {
  CREATE: "bg-green-50 text-green-700",
  UPDATE: "bg-amber-50 text-amber-700",
  READ: "bg-blue-50 text-blue-700",
  DELETE: "bg-red-50 text-red-700",
};

// ── Card Components ──

function ActionCard({ action }: { action: PlannedAction }) {
  const hasConflict = action.conflictsWith && action.conflictsWith.length > 0;
  const borderColor = BORDER_COLORS[action.type] || "border-l-slate-300";
  const badgeStyle = BADGE_STYLES[action.type] || "bg-slate-50 text-slate-700";
  const domainLabel = DOMAIN_LABELS[action.domain] || action.domain;
  const title = extractTitle(action);
  const assumption = extractAssumption(action);

  if (action.type === "CREATE") {
    return (
      <div
        className={`bg-white rounded-lg border border-slate-200 border-l-4 ${borderColor} p-4 ${
          hasConflict ? "opacity-50" : ""
        }`}
      >
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${badgeStyle}`}>
            CREATE
          </span>
          <span className="text-xs text-slate-400 font-medium">{domainLabel}</span>
          {hasConflict && <ConflictBadge />}
        </div>
        <p className={`text-sm font-semibold text-slate-900 mb-2 ${hasConflict ? "line-through" : ""}`}>
          {title}
        </p>
        {action.body && Object.keys(action.body).length > 0 && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
            {Object.entries(action.body).map(([key, val]) => {
              if (val === null || val === undefined) return null;
              if (typeof val === "object" && !Array.isArray(val)) return null;
              return (
                <div key={key} className="contents">
                  <span className="text-xs text-slate-500 truncate">
                    {formatFieldName(key)}
                  </span>
                  <span className="text-xs text-slate-900 font-medium truncate">
                    {formatFieldValue(val)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {assumption && (
          <p className="text-xs text-slate-400 italic mt-3">{assumption}</p>
        )}
      </div>
    );
  }

  if (action.type === "UPDATE") {
    const hasDiff = action.diff && action.diff.length > 0;
    return (
      <div
        className={`bg-white rounded-lg border border-slate-200 border-l-4 ${borderColor} p-4 ${
          hasConflict ? "opacity-50" : ""
        }`}
      >
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${badgeStyle}`}>
            UPDATE
          </span>
          <span className="text-xs text-slate-400 font-medium">{domainLabel}</span>
          {action.destructive && <DestructiveBadge />}
          {hasConflict && <ConflictBadge />}
        </div>
        <p className={`text-sm font-semibold text-slate-900 mb-2 ${hasConflict ? "line-through" : ""}`}>
          {title}
        </p>
        {hasDiff ? (
          <div className="mt-2 rounded-md border border-slate-100 overflow-hidden">
            <div className="grid grid-cols-[1fr,1fr,auto,1fr] text-xs">
              <div className="px-3 py-1.5 bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                Field
              </div>
              <div className="px-3 py-1.5 bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                Before
              </div>
              <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100" />
              <div className="px-3 py-1.5 bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                After
              </div>
              {action.diff.map((d, i) => (
                <div key={i} className="contents">
                  <div className="px-3 py-1.5 text-slate-600 border-b border-slate-50">
                    {formatFieldName(String(d.field))}
                  </div>
                  <div className="px-3 py-1.5 text-slate-400 line-through border-b border-slate-50">
                    {formatValue(d.from)}
                  </div>
                  <div className="px-3 py-1.5 text-slate-300 border-b border-slate-50">
                    &rarr;
                  </div>
                  <div className="px-3 py-1.5 text-slate-900 font-medium border-b border-slate-50">
                    {formatValue(d.to)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          action.body &&
          Object.keys(action.body).length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
              {Object.entries(action.body).map(([key, val]) => {
                if (val === null || val === undefined) return null;
                if (typeof val === "object" && !Array.isArray(val)) return null;
                return (
                  <div key={key} className="contents">
                    <span className="text-xs text-slate-500 truncate">
                      {formatFieldName(key)}
                    </span>
                    <span className="text-xs text-slate-900 font-medium truncate">
                      {formatFieldValue(val)}
                    </span>
                  </div>
                );
              })}
            </div>
          )
        )}
        {assumption && (
          <p className="text-xs text-slate-400 italic mt-3">{assumption}</p>
        )}
      </div>
    );
  }

  if (action.type === "DELETE") {
    return (
      <div
        className={`bg-white rounded-lg border border-slate-200 border-l-4 ${borderColor} p-4 ${
          hasConflict ? "opacity-50" : ""
        }`}
      >
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${badgeStyle}`}>
            DELETE
          </span>
          <span className="text-xs text-slate-400 font-medium">{domainLabel}</span>
          <DestructiveBadge />
          {hasConflict && <ConflictBadge />}
        </div>
        <p className={`text-sm font-semibold text-slate-900 mb-2 ${hasConflict ? "line-through" : ""}`}>
          {title}
        </p>
        <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 rounded-md">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-700">
            This action is permanent and cannot be undone.
          </p>
        </div>
      </div>
    );
  }

  return <ReadCard action={action} />;
}

function ReadCard({ action }: { action: PlannedAction }) {
  const domainLabel = DOMAIN_LABELS[action.domain] || action.domain;
  return (
    <div className="bg-slate-50 rounded-lg border border-slate-100 px-4 py-2.5 flex items-center gap-3">
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600">
        READ
      </span>
      <span className="text-xs text-slate-400 font-medium">{domainLabel}</span>
      <span className="text-xs text-slate-500 flex-1 truncate">
        {extractTitle(action)}
      </span>
    </div>
  );
}

function DestructiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">
      <AlertTriangle className="w-3 h-3" />
      DESTRUCTIVE
    </span>
  );
}

function ConflictBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700">
      <AlertTriangle className="w-3 h-3" />
      CONFLICT
    </span>
  );
}

function ErrorBanner({ error }: { error: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-red-700">{error}</p>
    </div>
  );
}

// ── Formatting ──

function formatFieldName(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatFieldValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "number") {
    if (val > 0 && val < 100000) {
      return `£${val.toFixed(2)}`;
    }
    return String(val);
  }
  return String(val);
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "number") {
    if (val > 0 && val < 100000) {
      return `£${val.toFixed(2)}`;
    }
    return String(val);
  }
  return String(val);
}
