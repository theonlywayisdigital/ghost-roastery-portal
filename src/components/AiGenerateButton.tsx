"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, Loader2, X, AlertTriangle } from "@/components/icons";
import type { GenerationType } from "@/lib/ai-prompts";

interface AiGenerateButtonProps {
  /** The generation type (determines which prompt template to use) */
  type: GenerationType;
  /** Context passed to the prompt builder (roaster name, campaign name, etc.) */
  context?: Record<string, unknown>;
  /** Called when the user selects one of the 3 generated options */
  onSelect: (text: string) => void;
  /** Optional label for the button (default: "AI") */
  label?: string;
  /** Optional className for the button wrapper */
  className?: string;
  /** Keyboard shortcut enabled (default: false — set true for one primary field per page) */
  enableShortcut?: boolean;
}

interface GenerateResponse {
  options: string[];
  usage?: { used: number; limit: number };
  error?: string;
  rate_limited?: boolean;
}

export function AiGenerateButton({
  type,
  context = {},
  onSelect,
  label = "AI",
  className = "",
  enableShortcut = false,
}: AiGenerateButtonProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if AI is available on mount
  useEffect(() => {
    fetch("/api/ai/status")
      .then((r) => r.json())
      .then((d) => setAvailable(d.available))
      .catch(() => setAvailable(false));
  }, []);

  // Keyboard shortcut (Cmd+J)
  useEffect(() => {
    if (!enableShortcut || available === false) return;
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enableShortcut, available]);

  // Focus input when popover opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOptions(null);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, context, prompt }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const data: GenerateResponse = await res.json();

      if (!res.ok) {
        setError(data.error || "Generation failed");
        return;
      }

      setOptions(data.options);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Request timed out. Please try again.");
      } else {
        setError("Failed to connect. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [type, context, prompt]);

  function handleSelect(option: string) {
    onSelect(option);
    setOpen(false);
    setOptions(null);
    setPrompt("");
    setError(null);
  }

  function handleClose() {
    setOpen(false);
    setOptions(null);
    setPrompt("");
    setError(null);
  }

  // Don't render if AI is not available
  if (available === false) return null;
  // Still loading availability check
  if (available === null) return null;

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-md transition-colors"
        title={enableShortcut ? `Generate with AI (${navigator.platform?.includes("Mac") ? "⌘" : "Ctrl"}+J)` : "Generate with AI"}
      >
        <Sparkles className="w-3.5 h-3.5" />
        {label}
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute z-50 top-full left-0 mt-1 w-80 bg-white rounded-xl border border-slate-200 shadow-lg"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-500" />
              AI Generate
            </span>
            <button onClick={handleClose} className="p-0.5 rounded hover:bg-slate-100">
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-3">
            {/* Input + Generate */}
            {!options && (
              <div>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !loading) generate();
                    }}
                    placeholder="Describe what you need..."
                    className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    disabled={loading}
                  />
                  <button
                    onClick={generate}
                    disabled={loading}
                    className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Generate"
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Leave blank for automatic suggestions, or describe what you want.
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-100 rounded-lg mt-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            {/* Options */}
            {options && options.length > 0 && (
              <div className="space-y-2">
                {options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelect(option)}
                    className="w-full text-left p-2.5 border border-slate-200 rounded-lg hover:border-violet-300 hover:bg-violet-50 transition-colors group"
                  >
                    <p className="text-sm text-slate-800 leading-relaxed">{option}</p>
                  </button>
                ))}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => {
                      setOptions(null);
                      setError(null);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Back
                  </button>
                  <button
                    onClick={generate}
                    disabled={loading}
                    className="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
                  >
                    {loading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    Regenerate
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
