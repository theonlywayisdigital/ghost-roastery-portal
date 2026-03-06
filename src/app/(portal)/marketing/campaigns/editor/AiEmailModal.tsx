"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2, X, Package, Ticket, AlertTriangle } from "@/components/icons";
import type { EmailBlock } from "@/types/marketing";
import { useMarketingContext } from "@/lib/marketing-context";

interface AiEmailModalProps {
  open: boolean;
  onClose: () => void;
  onGenerated: (result: { subject: string; preview_text: string; blocks: EmailBlock[] }) => void;
}

type Tone = "professional" | "friendly" | "casual" | "urgent" | "luxury";
type Length = "short" | "medium" | "long";

interface Product {
  id: string;
  name: string;
  description: string | null;
  retail_price: number | null;
}

interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
}

const TONES: { value: Tone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "casual", label: "Casual" },
  { value: "urgent", label: "Urgent" },
  { value: "luxury", label: "Luxury" },
];

const LENGTHS: { value: Length; label: string; desc: string }[] = [
  { value: "short", label: "Short", desc: "3-4 blocks" },
  { value: "medium", label: "Medium", desc: "5-7 blocks" },
  { value: "long", label: "Long", desc: "8+ blocks" },
];

export function AiEmailModal({ open, onClose, onGenerated }: AiEmailModalProps) {
  const { apiBase } = useMarketingContext();
  const [brief, setBrief] = useState("");
  const [tone, setTone] = useState<Tone>("friendly");
  const [length, setLength] = useState<Length>("medium");
  const [includeProducts, setIncludeProducts] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [includeDiscount, setIncludeDiscount] = useState(false);
  const [selectedDiscountId, setSelectedDiscountId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);

  useEffect(() => {
    if (!open) return;
    // Fetch products
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .catch(() => {});
    // Fetch active discount codes
    fetch(`${apiBase}/discount-codes?status=active`)
      .then((r) => r.json())
      .then((d) => setDiscountCodes(d.codes || []))
      .catch(() => {});
  }, [open]);

  async function handleGenerate() {
    if (!brief.trim()) {
      setError("Please describe what this email is about.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: brief.trim(),
          tone,
          length,
          includeProducts: includeProducts && selectedProductIds.length > 0,
          productIds: includeProducts ? selectedProductIds : undefined,
          includeDiscount: includeDiscount && !!selectedDiscountId,
          discountCodeId: includeDiscount ? selectedDiscountId : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Generation failed");
        setLoading(false);
        return;
      }

      onGenerated({
        subject: data.subject,
        preview_text: data.preview_text,
        blocks: data.blocks,
      });
      onClose();
      resetForm();
    } catch {
      setError("Failed to connect. Please try again.");
    }
    setLoading(false);
  }

  function resetForm() {
    setBrief("");
    setTone("friendly");
    setLength("medium");
    setIncludeProducts(false);
    setSelectedProductIds([]);
    setIncludeDiscount(false);
    setSelectedDiscountId("");
    setError(null);
  }

  function toggleProduct(id: string) {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Generate Email with AI</h2>
              <p className="text-xs text-slate-400">Describe your email and we'll write it for you</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5">
          {/* Brief */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              What's this email about?
            </label>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={3}
              placeholder="e.g. New single origin Ethiopian coffee launching next week, 15% off for first orders, roasted in small batches"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              disabled={loading}
            />
          </div>

          {/* Tone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tone</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  disabled={loading}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    tone === t.value
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Length */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Length</label>
            <div className="flex gap-2">
              {LENGTHS.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLength(l.value)}
                  disabled={loading}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    length === l.value
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <div>{l.label}</div>
                  <div className="text-[10px] text-slate-400 font-normal mt-0.5">{l.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Include Products */}
          <div>
            <button
              onClick={() => setIncludeProducts(!includeProducts)}
              disabled={loading}
              className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                includeProducts
                  ? "border-violet-300 bg-violet-50 text-violet-700"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              <Package className="w-4 h-4" />
              <span className="font-medium">Include product grid</span>
            </button>
            {includeProducts && products.length > 0 && (
              <div className="mt-2 max-h-32 overflow-y-auto space-y-1 pl-1">
                {products.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(p.id)}
                      onChange={() => toggleProduct(p.id)}
                      className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    {p.name}
                    {p.retail_price != null && (
                      <span className="text-slate-400">{`£${p.retail_price}`}</span>
                    )}
                  </label>
                ))}
              </div>
            )}
            {includeProducts && products.length === 0 && (
              <p className="text-xs text-slate-400 mt-1 ml-1">No products found.</p>
            )}
          </div>

          {/* Include Discount */}
          <div>
            <button
              onClick={() => setIncludeDiscount(!includeDiscount)}
              disabled={loading}
              className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                includeDiscount
                  ? "border-violet-300 bg-violet-50 text-violet-700"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span className="font-medium">Include discount code</span>
            </button>
            {includeDiscount && discountCodes.length > 0 && (
              <select
                value={selectedDiscountId}
                onChange={(e) => setSelectedDiscountId(e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Select a discount code...</option>
                {discountCodes.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} — {d.discount_type === "percentage" ? `${d.discount_value}% off` : d.discount_type === "fixed_amount" ? `£${d.discount_value} off` : "Free shipping"}
                  </option>
                ))}
              </select>
            )}
            {includeDiscount && discountCodes.length === 0 && (
              <p className="text-xs text-slate-400 mt-1 ml-1">No active discount codes found.</p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading || !brief.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Writing your email...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
