"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMarketingContext } from "@/lib/marketing-context";
import {
  ArrowLeft,
  Loader2,
  Shuffle,
  AlertTriangle,
} from "@/components/icons";
import type { DiscountCode, DiscountType, DiscountAppliesTo } from "@/types/marketing";
import { AiGenerateButton } from "@/components/AiGenerateButton";

interface DiscountCodeFormProps {
  mode: "create" | "edit";
  initialData?: DiscountCode;
}

function generateRandomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `GHOST-${part()}`;
}

export function DiscountCodeForm({ mode, initialData }: DiscountCodeFormProps) {
  const router = useRouter();
  const { apiBase, pageBase } = useMarketingContext();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState(initialData?.code || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [discountType, setDiscountType] = useState<DiscountType>(initialData?.discount_type || "percentage");
  const [discountValue, setDiscountValue] = useState(String(initialData?.discount_value || ""));
  const [maximumDiscount, setMaximumDiscount] = useState(
    initialData?.maximum_discount ? String(initialData.maximum_discount) : ""
  );
  const [minimumOrderValue, setMinimumOrderValue] = useState(
    initialData?.minimum_order_value ? String(initialData.minimum_order_value) : ""
  );
  const [firstOrderOnly, setFirstOrderOnly] = useState(initialData?.first_order_only || false);
  const [appliesTo, setAppliesTo] = useState<DiscountAppliesTo>(initialData?.applies_to || "all_products");
  const [productIds, setProductIds] = useState<string[]>(initialData?.product_ids || []);
  const [usageLimit, setUsageLimit] = useState(
    initialData?.usage_limit ? String(initialData.usage_limit) : ""
  );
  const [unlimitedUsage, setUnlimitedUsage] = useState(!initialData?.usage_limit);
  const [usagePerCustomer, setUsagePerCustomer] = useState(String(initialData?.usage_per_customer ?? 1));
  const [startsAt, setStartsAt] = useState(
    initialData?.starts_at ? initialData.starts_at.slice(0, 16) : ""
  );
  const [expiresAt, setExpiresAt] = useState(
    initialData?.expires_at ? initialData.expires_at.slice(0, 16) : ""
  );
  const [noExpiry, setNoExpiry] = useState(!initialData?.expires_at);
  const [autoApply, setAutoApply] = useState(initialData?.auto_apply || false);
  const [status, setStatus] = useState<"active" | "paused">(
    initialData?.status === "paused" ? "paused" : "active"
  );

  // Products for product selector
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Load products when applies_to changes to specific_products
  useEffect(() => {
    if (appliesTo === "specific_products" && products.length === 0) {
      setLoadingProducts(true);
      fetch("/api/products")
        .then((res) => (res.ok ? res.json() : { products: [] }))
        .then((data) => setProducts(data.products || []))
        .catch(() => setProducts([]))
        .finally(() => setLoadingProducts(false));
    }
  }, [appliesTo, products.length]);

  // Past date warning
  const isPastExpiry = expiresAt && new Date(expiresAt) < new Date();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      code: code.toUpperCase().trim(),
      description: description || null,
      discount_type: discountType,
      discount_value: parseFloat(discountValue) || 0,
      maximum_discount: maximumDiscount ? parseFloat(maximumDiscount) : null,
      minimum_order_value: minimumOrderValue ? parseFloat(minimumOrderValue) : null,
      first_order_only: firstOrderOnly,
      applies_to: appliesTo,
      product_ids: appliesTo === "specific_products" ? productIds : [],
      usage_limit: unlimitedUsage ? null : parseInt(usageLimit) || null,
      usage_per_customer: parseInt(usagePerCustomer) || 1,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      expires_at: noExpiry ? null : expiresAt ? new Date(expiresAt).toISOString() : null,
      auto_apply: autoApply,
      status,
    };

    try {
      const url =
        mode === "create"
          ? `${apiBase}/discount-codes`
          : `${apiBase}/discount-codes/${initialData!.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`${pageBase}/discount-codes/${data.code.id}`);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to save discount code.");
        setSaving(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white";
  const selectClass =
    "w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push(`${pageBase}/discount-codes`)}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-900">
            {mode === "create" ? "Create Discount Code" : "Edit Discount Code"}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Status toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Status:</span>
            <button
              type="button"
              onClick={() => setStatus(status === "active" ? "paused" : "active")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                status === "active"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {status === "active" ? "Active" : "Paused"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Code & Description */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Code & Description</h3>
          <div>
            <label className={labelClass}>Discount Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. GHOST-A7X2"
                required
                className={`${inputClass} font-mono uppercase`}
                disabled={mode === "edit" && (initialData?.used_count || 0) > 0}
              />
              {mode === "create" && (
                <button
                  type="button"
                  onClick={() => setCode(generateRandomCode())}
                  className="px-3 py-2.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                  title="Generate random code"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">Letters, numbers, and hyphens only. Auto-uppercase.</p>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className={labelClass}>
                Description <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <AiGenerateButton
                type="discount_description"
                context={{ existingContent: description, discountType, discountValue }}
                onSelect={setDescription}
                enableShortcut
              />
            </div>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Summer sale 2026"
              className={inputClass}
            />
          </div>
        </div>

        {/* Section 2: Discount Type & Value */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Discount</h3>
          <div>
            <label className={labelClass}>Discount Type</label>
            <div className="flex gap-2">
              {([
                { value: "percentage", label: "Percentage" },
                { value: "fixed_amount", label: "Fixed Amount" },
                { value: "free_shipping", label: "Free Shipping" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDiscountType(opt.value)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    discountType === opt.value
                      ? "bg-brand-50 text-brand-700 border border-brand-200"
                      : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {discountType !== "free_shipping" && (
            <div>
              <label className={labelClass}>
                {discountType === "percentage" ? "Percentage Off" : "Amount Off (£)"}
              </label>
              <div className="relative max-w-xs">
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percentage" ? "10" : "5.00"}
                  min="0"
                  max={discountType === "percentage" ? "100" : undefined}
                  step={discountType === "percentage" ? "1" : "0.01"}
                  required
                  className={inputClass}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  {discountType === "percentage" ? "%" : "£"}
                </span>
              </div>
            </div>
          )}
          {discountType === "percentage" && (
            <div>
              <label className={labelClass}>
                Maximum Discount Cap (£) <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                value={maximumDiscount}
                onChange={(e) => setMaximumDiscount(e.target.value)}
                placeholder="e.g. 50.00"
                min="0"
                step="0.01"
                className={`${inputClass} max-w-xs`}
              />
            </div>
          )}
        </div>

        {/* Section 3: Conditions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Conditions</h3>
          <div>
            <label className={labelClass}>
              Minimum Order Value (£) <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="number"
              value={minimumOrderValue}
              onChange={(e) => setMinimumOrderValue(e.target.value)}
              placeholder="e.g. 20.00"
              min="0"
              step="0.01"
              className={`${inputClass} max-w-xs`}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFirstOrderOnly(!firstOrderOnly)}
              className={`relative w-10 h-6 rounded-full transition-colors ${
                firstOrderOnly ? "bg-brand-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  firstOrderOnly ? "translate-x-4" : ""
                }`}
              />
            </button>
            <span className="text-sm text-slate-700">First order only</span>
          </div>
          <div>
            <label className={labelClass}>Applies To</label>
            <div className="flex gap-2">
              {([
                { value: "all_products", label: "All Products" },
                { value: "specific_products", label: "Specific Products" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAppliesTo(opt.value)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    appliesTo === opt.value
                      ? "bg-brand-50 text-brand-700 border border-brand-200"
                      : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {appliesTo === "specific_products" && (
            <div>
              <label className={labelClass}>Select Products</label>
              {loadingProducts ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading products...
                </div>
              ) : products.length === 0 ? (
                <p className="text-sm text-slate-400">No products found.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {products.map((product) => (
                    <label
                      key={product.id}
                      className="flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={productIds.includes(product.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setProductIds([...productIds, product.id]);
                          } else {
                            setProductIds(productIds.filter((id) => id !== product.id));
                          }
                        }}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-slate-700">{product.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 4: Usage Limits */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Usage Limits</h3>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-700">Total Usage Limit</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUnlimitedUsage(!unlimitedUsage)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    unlimitedUsage ? "bg-brand-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      unlimitedUsage ? "translate-x-4" : ""
                    }`}
                  />
                </button>
                <span className="text-xs text-slate-500">Unlimited</span>
              </div>
            </div>
            {!unlimitedUsage && (
              <input
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                placeholder="e.g. 100"
                min="1"
                className={`${inputClass} max-w-xs`}
              />
            )}
          </div>
          <div>
            <label className={labelClass}>Usage Per Customer</label>
            <input
              type="number"
              value={usagePerCustomer}
              onChange={(e) => setUsagePerCustomer(e.target.value)}
              min="1"
              className={`${inputClass} max-w-xs`}
            />
          </div>
        </div>

        {/* Section 5: Schedule */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Schedule</h3>
          <div>
            <label className={labelClass}>
              Start Date <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className={`${inputClass} max-w-xs`}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-700">End Date</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNoExpiry(!noExpiry)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    noExpiry ? "bg-brand-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      noExpiry ? "translate-x-4" : ""
                    }`}
                  />
                </button>
                <span className="text-xs text-slate-500">No expiry</span>
              </div>
            </div>
            {!noExpiry && (
              <>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className={`${inputClass} max-w-xs`}
                />
                {isPastExpiry && (
                  <div className="flex items-center gap-1.5 mt-2 text-amber-600 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    This date is in the past. The code will be expired immediately.
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Section 6: Auto-Apply */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Auto-Apply</h3>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAutoApply(!autoApply)}
              className={`relative w-10 h-6 rounded-full transition-colors ${
                autoApply ? "bg-brand-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  autoApply ? "translate-x-4" : ""
                }`}
              />
            </button>
            <div>
              <span className="text-sm text-slate-700">Automatically apply at checkout</span>
              <p className="text-xs text-slate-400">Only one auto-apply code can be active at a time.</p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push(`${pageBase}/discount-codes`)}
            className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "create" ? "Create Discount Code" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
