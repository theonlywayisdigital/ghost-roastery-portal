"use client";

import { useState, useRef, useCallback, useEffect, Fragment } from "react";
import {
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  AlertTriangle,
  Copy,
  ChevronDown,
  ChevronUp,
  Search,
  Package,
  Users,
  Leaf,
  Coffee,
  Store,
  Tag,
  X,
  FileText,
  Upload,
} from "@/components/icons";
import * as XLSX from "xlsx";

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

interface EntityRef {
  type: string;
  id: string;
  name: string;
  detail: string;
}

interface PickerData {
  type: string;
  prompt: string;
  items: Array<{ id: string; name: string; detail: string }>;
}

interface AttachedFile {
  name: string;
  mimeType: string;
  data: string;
  isText: boolean;
  size: number;
}

interface ChatMessage {
  role: "user" | "model";
  content: string;
  chips?: Chip[];
  entities?: EntityRef[];
  picker?: PickerData;
  file?: { name: string; size: number };
}

type Phase = "input" | "conversation" | "planning" | "review" | "executing" | "done";

interface ExecutionStatus {
  actionId: string;
  status: "pending" | "running" | "done" | "failed";
  error?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "image/png",
  "image/jpeg",
]);

const TEXT_MIME_TYPES = new Set([
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

// ── Parsing helpers ──

function parseChips(text: string): { clean: string; chips: Chip[] } {
  const idx = text.lastIndexOf("CHIPS:[");
  if (idx === -1) return { clean: text, chips: [] };

  const clean = text.slice(0, idx).trimEnd();
  const jsonStr = text.slice(idx + 6);
  try {
    const chips = JSON.parse(jsonStr) as Chip[];
    if (!Array.isArray(chips)) return { clean, chips: [] };
    return { clean, chips };
  } catch {
    return { clean, chips: [] };
  }
}

function parsePicker(text: string): { clean: string; picker: PickerData | null } {
  const idx = text.lastIndexOf("PICKER:{");
  if (idx === -1) return { clean: text, picker: null };

  const clean = text.slice(0, idx).trimEnd();
  const jsonStr = text.slice(idx + 7);
  try {
    const picker = JSON.parse(jsonStr) as PickerData;
    if (!picker || !picker.items || !Array.isArray(picker.items)) return { clean, picker: null };
    return { clean, picker };
  } catch {
    return { clean, picker: null };
  }
}

function parseEntities(text: string): { segments: Array<{ text: string } | { entity: EntityRef }>; entities: EntityRef[] } {
  const entities: EntityRef[] = [];
  const segments: Array<{ text: string } | { entity: EntityRef }> = [];
  const regex = /ENTITY:\{[^}]+\}/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }
    const jsonStr = match[0].slice(7);
    try {
      const entity = JSON.parse(jsonStr) as EntityRef;
      entities.push(entity);
      segments.push({ entity });
    } catch {
      segments.push({ text: match[0] });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  if (segments.length === 0 && text.length > 0) {
    segments.push({ text });
  }

  return { segments, entities };
}

function tryExtractPlan(text: string): { actions: PlannedAction[]; summary: string; preText: string } | null {
  // Try to find a JSON plan embedded in the message text
  // 1. Strip ```json ... ``` code fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  const candidate = fenceMatch ? fenceMatch[1].trim() : text.trim();
  const preText = fenceMatch ? text.slice(0, text.indexOf(fenceMatch[0])).trim() : "";

  let plan: { plan?: unknown[]; summary?: string } | null = null;

  // 2. Try parsing directly
  try {
    plan = JSON.parse(candidate);
  } catch {
    // 3. Extract outermost JSON object
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        plan = JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
      } catch {
        // Not valid JSON
      }
    }
  }

  if (plan?.plan && Array.isArray(plan.plan) && plan.plan.length > 0) {
    const finalPreText = preText || (
      !fenceMatch && candidate.indexOf("{") > 0
        ? candidate.slice(0, candidate.indexOf("{")).trim()
        : ""
    );
    return {
      actions: plan.plan as PlannedAction[],
      summary: (plan.summary as string) || "",
      preText: finalPreText,
    };
  }

  return null;
}

function parseModelMessage(raw: string): Omit<ChatMessage, "role"> {
  // Order: picker first (mutually exclusive with chips), then entities from clean text
  let text = raw;
  let chips: Chip[] | undefined;
  let picker: PickerData | undefined;

  // Try picker first
  const pickerResult = parsePicker(text);
  if (pickerResult.picker) {
    text = pickerResult.clean;
    picker = pickerResult.picker;
  } else {
    // Try chips
    const chipResult = parseChips(text);
    if (chipResult.chips.length > 0) {
      text = chipResult.clean;
      chips = chipResult.chips;
    }
  }

  // Parse entities from the remaining text
  const { segments, entities } = parseEntities(text);
  const cleanContent = segments.map((s) => "text" in s ? s.text : s.entity.name).join("");

  return {
    content: cleanContent,
    chips: chips && chips.length > 0 ? chips : undefined,
    entities: entities.length > 0 ? entities : undefined,
    picker: picker || undefined,
  };
}

// ── Entity type icons and colors ──

const ENTITY_CONFIG: Record<string, { icon: typeof Package; bg: string; text: string }> = {
  product: { icon: Package, bg: "bg-amber-50", text: "text-amber-700" },
  contact: { icon: Users, bg: "bg-blue-50", text: "text-blue-700" },
  greenBean: { icon: Leaf, bg: "bg-green-50", text: "text-green-700" },
  roastedStock: { icon: Coffee, bg: "bg-orange-50", text: "text-orange-700" },
  wholesaleBuyer: { icon: Store, bg: "bg-purple-50", text: "text-purple-700" },
  discountCode: { icon: Tag, bg: "bg-pink-50", text: "text-pink-700" },
};

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
  const [activePicker, setActivePicker] = useState<PickerData | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<{ message: string } | null>(null);
  const [documentContext, setDocumentContext] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Focus chat input when conversation phase starts
  useEffect(() => {
    if (phase === "conversation" && !isThinking && !activePicker) {
      chatInputRef.current?.focus();
    }
  }, [phase, isThinking, activePicker]);

  // Close picker on outside click
  useEffect(() => {
    if (!activePicker) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setActivePicker(null);
        setPickerSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [activePicker]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // ── File processing ──

  const processFile = useCallback(async (file: File): Promise<AttachedFile | null> => {
    if (file.size > MAX_FILE_SIZE) {
      setToast({ message: "File too large — maximum 10MB" });
      return null;
    }
    if (!SUPPORTED_MIME_TYPES.has(file.type)) {
      setToast({ message: "Beans can read PDF, Word, Excel, CSV, and image files" });
      return null;
    }

    // CSV — read as text
    if (file.type === "text/csv") {
      const text = await file.text();
      return { name: file.name, mimeType: file.type, data: text, isText: true, size: file.size };
    }

    // XLSX/XLS — convert to CSV text
    if (TEXT_MIME_TYPES.has(file.type)) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const csvParts: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (workbook.SheetNames.length > 1) {
          csvParts.push(`--- Sheet: ${sheetName} ---`);
        }
        csvParts.push(XLSX.utils.sheet_to_csv(sheet));
      }
      return { name: file.name, mimeType: file.type, data: csvParts.join("\n"), isText: true, size: file.size };
    }

    // PDF, DOCX, images — read as base64
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // Strip data URI prefix (e.g. "data:application/pdf;base64,")
        const base64 = dataUrl.split(",")[1] || "";
        resolve({ name: file.name, mimeType: file.type, data: base64, isText: false, size: file.size });
      };
      reader.onerror = () => {
        setToast({ message: "Failed to read file" });
        resolve(null);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // ── Send message to plan API ──

  const sendMessage = useCallback(
    async (text: string, currentMessages: ChatMessage[], file?: AttachedFile | null) => {
      if (!text.trim() && !file) return;

      // Close any active picker
      setActivePicker(null);
      setPickerSearch("");

      // Add user message to chat (with file metadata for display)
      const userMsg: ChatMessage = {
        role: "user",
        content: text || (file ? `Attached: ${file.name}` : ""),
        ...(file ? { file: { name: file.name, size: file.size } } : {}),
      };
      const updatedMessages = [...currentMessages, userMsg];
      setMessages(updatedMessages);
      setIsThinking(true);
      setError(null);
      setToolCalls([]);
      setAttachedFile(null);

      const controller = new AbortController();
      abortRef.current = controller;

      // Build history for API (exclude chips/entities/picker metadata)
      const history = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Build request body
      const body: Record<string, unknown> = {
        message: text || (file ? `Please analyze this file: ${file.name}` : ""),
        history: history.slice(0, -1),
      };
      if (file) {
        body.file = { name: file.name, mimeType: file.mimeType, data: file.data, isText: file.isText };
      }
      if (documentContext) {
        body.documentContext = documentContext;
      }

      try {
        const res = await fetch("/api/beans/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
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
                  case "document_context":
                    setDocumentContext(data.text || null);
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
          setActions(receivedActions);
          setSummary(receivedSummary);
          setPhase("review");
        } else if (receivedMessage) {
          // Client-side fallback: check if the message contains an embedded JSON plan
          // that the server failed to parse (e.g. ```json fenced or mixed prose+JSON)
          const extractedPlan = tryExtractPlan(receivedMessage);
          if (extractedPlan) {
            // Show any preamble text as a chat message
            if (extractedPlan.preText) {
              const parsed = parseModelMessage(extractedPlan.preText);
              const modelMsg: ChatMessage = { role: "model", ...parsed };
              setMessages((prev) => [...prev, modelMsg]);
            }
            setActions(extractedPlan.actions);
            setSummary(extractedPlan.summary);
            setPhase("review");
          } else {
            const parsed = parseModelMessage(receivedMessage);
            const modelMsg: ChatMessage = { role: "model", ...parsed };
            setMessages((prev) => [...prev, modelMsg]);

            // If message contains a picker, show it
            if (parsed.picker) {
              setActivePicker(parsed.picker);
            }

            setPhase("conversation");
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
        setIsThinking(false);
      }
    },
    [documentContext]
  );

  // ── Handlers ──

  const handleInitialSend = useCallback(
    (text?: string) => {
      const msg = text || prompt;
      if (!msg.trim() && !attachedFile) return;
      setPhase("conversation");
      sendMessage(msg, [], attachedFile);
    },
    [prompt, attachedFile, sendMessage]
  );

  const handleChatSend = useCallback(() => {
    if ((!chatInput.trim() && !attachedFile) || isThinking) return;
    const text = chatInput;
    const file = attachedFile;
    setChatInput("");
    sendMessage(text, messages, file);
  }, [chatInput, attachedFile, isThinking, messages, sendMessage]);

  const handleChipClick = useCallback(
    (chip: Chip) => {
      if (isThinking) return;
      sendMessage(chip.value, messages);
    },
    [isThinking, messages, sendMessage]
  );

  const handlePickerSelect = useCallback(
    (item: { id: string; name: string; detail: string }) => {
      if (isThinking) return;
      setActivePicker(null);
      setPickerSearch("");
      sendMessage(item.name, messages);
    },
    [isThinking, messages, sendMessage]
  );

  // ── Drag and drop ──

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only hide overlay if leaving the container (not entering a child)
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    const processed = await processFile(file);
    if (!processed) return;

    if (phase === "conversation") {
      // Mid-conversation: send file as next message immediately
      sendMessage("", messages, processed);
    } else {
      // Input phase: attach to input
      setAttachedFile(processed);
    }
  }, [phase, messages, processFile, sendMessage]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // Reset so same file can be selected again

    const processed = await processFile(file);
    if (!processed) return;

    if (phase === "conversation") {
      setAttachedFile(processed);
    } else {
      setAttachedFile(processed);
    }
  }, [phase, processFile]);

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
    setActivePicker(null);
    setPickerSearch("");
    setAttachedFile(null);
    setDocumentContext(null);
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
    setActivePicker(null);
    setPickerSearch("");
    setAttachedFile(null);
    setDocumentContext(null);
  }

  function copySummary() {
    const lines = actions
      .filter((a) => a.type !== "READ")
      .map((a) => `${a.destructive ? "⚠️" : "✅"} ${a.label}`);
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

  const execTotal = Array.from(executionStatuses.values()).length;
  const execDone = Array.from(executionStatuses.values()).filter(
    (s) => s.status === "done" || s.status === "failed"
  ).length;

  // Filtered picker items
  const filteredPickerItems = activePicker
    ? activePicker.items.filter(
        (item) =>
          item.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
          item.detail.toLowerCase().includes(pickerSearch.toLowerCase())
      )
    : [];

  return (
    <div
      className="max-w-3xl mx-auto pb-24 relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.docx,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
        onChange={handleFileSelect}
      />

      {/* Drag overlay */}
      {dragOver && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-amber-700" fill="currentColor">
                <ellipse cx="12" cy="12" rx="5" ry="8" transform="rotate(-30 12 12)" opacity="0.6" />
                <ellipse cx="12" cy="12" rx="5" ry="8" transform="rotate(30 12 12)" opacity="0.6" />
              </svg>
            </div>
            <p className="text-white text-lg font-medium">Drop for Beans to read</p>
            <p className="text-white/60 text-sm">PDF, Word, Excel, CSV, or images</p>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-xs animate-in slide-in-from-bottom-2">
          {toast.message}
        </div>
      )}

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
            {/* Attached file card */}
            {attachedFile && (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg mb-3">
                <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="text-sm text-slate-700 truncate flex-1">{attachedFile.name}</span>
                <span className="text-xs text-slate-400 flex-shrink-0">{formatFileSize(attachedFile.size)}</span>
                <button
                  onClick={() => setAttachedFile(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t border-slate-100">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg text-sm transition-colors"
                title="Attach a file"
              >
                <Upload className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleInitialSend()}
                disabled={!prompt.trim() && !attachedFile}
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
                      {msg.file && (
                        <div className="flex items-center gap-2 mb-2 px-2.5 py-1.5 bg-white/10 rounded-lg">
                          <FileText className="w-4 h-4 text-white/70 flex-shrink-0" />
                          <span className="text-sm text-white/90 truncate">{msg.file.name}</span>
                          <span className="text-xs text-white/50 flex-shrink-0">{formatFileSize(msg.file.size)}</span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 items-start">
                    <BeanAvatar />
                    <div className="max-w-[80%]">
                      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3">
                        <MessageContent message={msg} />
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
                <BeanAvatar />
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

          {/* Entity Picker panel */}
          {activePicker && (
            <div
              ref={pickerRef}
              className="mb-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-700">
                  {activePicker.prompt}
                </p>
                <button
                  onClick={() => { setActivePicker(null); setPickerSearch(""); }}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-4 py-2 border-b border-slate-100">
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Search..."
                    className="flex-1 bg-transparent border-0 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-0 focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredPickerItems.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-slate-400">No results</p>
                ) : (
                  filteredPickerItems.map((item) => {
                    const config = ENTITY_CONFIG[activePicker.type];
                    const Icon = config?.icon || Package;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handlePickerSelect(item)}
                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${config?.bg || "bg-slate-50"}`}>
                          <Icon className={`w-3.5 h-3.5 ${config?.text || "text-slate-600"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {item.detail}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Attached file card (conversation) */}
          {attachedFile && (
            <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-slate-50 border border-slate-200 rounded-lg">
              <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="text-sm text-slate-700 truncate flex-1">{attachedFile.name}</span>
              <span className="text-xs text-slate-400 flex-shrink-0">{formatFileSize(attachedFile.size)}</span>
              <button
                onClick={() => setAttachedFile(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
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
              onClick={() => fileInputRef.current?.click()}
              disabled={isThinking}
              className="px-2 py-2 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0 disabled:opacity-50"
              title="Attach a file"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              onClick={handleChatSend}
              disabled={(!chatInput.trim() && !attachedFile) || isThinking}
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

          {conflictCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                {conflictCount} {conflictCount === 1 ? "action" : "actions"}{" "}
                skipped due to conflicts.
              </p>
            </div>
          )}

          {writeActions.length > 0 && (
            <div className="space-y-3">
              {writeActions.map((action) => (
                <ActionCard key={action.id} action={action} allActions={actions} />
              ))}
            </div>
          )}

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

          {writeActions.length > 0 && (
            <div className="space-y-3">
              {writeActions.map((action) => (
                <ActionCard key={action.id} action={action} allActions={actions} />
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

// ── Sub-components ──

function BeanAvatar() {
  return (
    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
      <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-700" fill="currentColor">
        <ellipse cx="12" cy="12" rx="5" ry="8" transform="rotate(-30 12 12)" opacity="0.6" />
        <ellipse cx="12" cy="12" rx="5" ry="8" transform="rotate(30 12 12)" opacity="0.6" />
      </svg>
    </div>
  );
}

function BeansEntityCard({ entity }: { entity: EntityRef }) {
  const config = ENTITY_CONFIG[entity.type];
  const Icon = config?.icon || Package;

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg mx-0.5 align-middle">
      <span className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${config?.bg || "bg-slate-100"}`}>
        <Icon className={`w-3 h-3 ${config?.text || "text-slate-600"}`} />
      </span>
      <span className="text-xs font-medium text-slate-900">{entity.name}</span>
      {entity.detail && (
        <span className="text-xs text-slate-500">{entity.detail}</span>
      )}
    </span>
  );
}

function MessageContent({ message }: { message: ChatMessage }) {
  // Re-parse the original content for entity rendering if entities exist
  if (message.entities && message.entities.length > 0) {
    // We stored the clean content (entities replaced with names),
    // but we need to render entity cards at the right positions.
    // Since we stripped ENTITY tags and joined with entity names,
    // we'll render entities inline after each text segment.
    // Simple approach: render the text and append entity cards after mentions.
    return (
      <p className="text-sm text-slate-800 whitespace-pre-wrap">
        {message.content}
        {message.entities.map((entity, i) => (
          <Fragment key={i}>
            {i === 0 && <br />}
            <BeansEntityCard entity={entity} />
          </Fragment>
        ))}
      </p>
    );
  }

  return (
    <p className="text-sm text-slate-800 whitespace-pre-wrap">
      {message.content}
    </p>
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

function ActionCard({ action, allActions = [] }: { action: PlannedAction; allActions?: PlannedAction[] }) {
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
          <div className="mt-2">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {Object.entries(action.body).map(([key, val]) => {
                if (val === null || val === undefined) return null;
                // Skip plain objects (not arrays)
                if (typeof val === "object" && !Array.isArray(val)) return null;
                // Arrays of objects get rendered separately below
                if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object") return null;

                // If current_stock_kg is 0 and a dependent action exists, annotate
                let displayValue = formatFieldValue(val, key);
                if (
                  key === "current_stock_kg" &&
                  val === 0 &&
                  allActions.some((a) => a.dependsOn?.includes(action.id))
                ) {
                  displayValue = "0kg (stock received separately)";
                }

                return (
                  <div key={key} className="contents">
                    <span className="text-xs text-slate-500 truncate">
                      {formatFieldName(key)}
                    </span>
                    <span className="text-xs text-slate-900 font-medium truncate">
                      {displayValue}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Render array-of-objects fields (e.g. order items) */}
            {Object.entries(action.body).map(([key, val]) => {
              if (!Array.isArray(val) || val.length === 0 || typeof val[0] !== "object") return null;
              return (
                <div key={key} className="mt-2">
                  <span className="text-xs text-slate-500">{formatFieldName(key)}</span>
                  <div className="mt-1 space-y-1">
                    {(val as Array<Record<string, unknown>>).map((item, idx) => (
                      <div key={idx} className="text-xs text-slate-900 font-medium bg-slate-50 rounded px-2 py-1">
                        {formatObjectItem(item, key)}
                      </div>
                    ))}
                  </div>
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
                    {formatValue(d.from, String(d.field))}
                  </div>
                  <div className="px-3 py-1.5 text-slate-300 border-b border-slate-50">
                    &rarr;
                  </div>
                  <div className="px-3 py-1.5 text-slate-900 font-medium border-b border-slate-50">
                    {formatValue(d.to, String(d.field))}
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
                      {formatFieldValue(val, key)}
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

function isWeightField(fieldName: string): boolean {
  return /_kg$/i.test(fieldName) || /_grams$/i.test(fieldName);
}

function isCurrencyField(fieldName: string): boolean {
  return /price|cost|value|total|payout|subtotal/i.test(fieldName);
}

function formatNumericValue(val: number, fieldName?: string): string {
  if (fieldName && isWeightField(fieldName)) {
    return fieldName.endsWith("_grams") ? `${val}g` : `${val}kg`;
  }
  if (fieldName && isCurrencyField(fieldName)) {
    return `£${val.toFixed(2)}`;
  }
  // No field name hint — don't assume currency
  if (typeof val === "number" && !Number.isInteger(val)) {
    return String(val);
  }
  return String(val);
}

function formatObjectItem(item: Record<string, unknown>, fieldKey: string): string {
  // Order items: render as "Product Name Variant × Quantity — £Price"
  if (fieldKey === "items" || fieldKey === "line_items") {
    const name = (item.productName || item.product_name || item.name || "") as string;
    const variant = (item.variantName || item.variant_name || item.variant || item.weight || "") as string;
    const qty = item.quantity ?? item.qty ?? 1;
    const price = item.unitPrice ?? item.unit_price ?? item.price ?? item.retail_price;
    const productId = (item.productId || item.product_id || "") as string;

    const label = name || (productId ? `Product ${productId.slice(0, 8)}...` : "Item");
    const parts = [label];
    if (variant) parts[0] = `${label} ${variant}`;
    parts.push(`\u00d7 ${qty}`);
    if (price != null && typeof price === "number") parts.push(`\u2014 \u00a3${price.toFixed(2)}`);
    return parts.join(" ");
  }

  // Generic fallback: show key=value pairs
  const pairs = Object.entries(item)
    .filter(([, v]) => v != null && typeof v !== "object")
    .map(([k, v]) => `${formatFieldName(k)}: ${v}`)
    .slice(0, 4);
  return pairs.join(", ") || JSON.stringify(item);
}

function formatFieldValue(val: unknown, fieldName?: string): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "number") return formatNumericValue(val, fieldName);
  return String(val);
}

function formatValue(val: unknown, fieldName?: string): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "number") return formatNumericValue(val, fieldName);
  return String(val);
}
