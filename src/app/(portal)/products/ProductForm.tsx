"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  X,
  ImageIcon,
  Copy,
} from "@/components/icons";
import Link from "next/link";
import { AiGenerateButton } from "@/components/AiGenerateButton";
import { compressImage } from "@/lib/compress-image";


interface Product {
  id: string;
  name: string;
  description: string | null;
  meta_description: string | null;
  price: number;
  unit: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  is_retail: boolean;
  is_wholesale: boolean;
  product_type: "retail" | "wholesale" | "both";
  retail_price: number | null;
  wholesale_price: number | null;
  wholesale_price_standard: number | null;
  wholesale_price_preferred: number | null;
  wholesale_price_vip: number | null;
  minimum_wholesale_quantity: number | null;
  sku: string | null;
  weight_grams: number | null;
  is_purchasable: boolean;
  track_stock: boolean;
  retail_stock_count: number | null;
  brand: string | null;
  gtin: string | null;
  google_product_category: string | null;
  vat_rate: number | null;
  rrp: number | null;
  order_multiples: number | null;
  subscription_frequency: string | null;
}

interface GrindType {
  id: string;
  name: string;
  sort_order: number;
}

interface Variant {
  id?: string;
  weight_grams: number | null;
  unit: string | null;
  grind_type_id: string | null;
  grind_type?: { id: string; name: string } | null;
  sku: string | null;
  retail_price: number | null;
  wholesale_price: number | null;
  wholesale_price_standard: number | null;
  wholesale_price_preferred: number | null;
  wholesale_price_vip: number | null;
  retail_stock_count: number | null;
  track_stock: boolean;
  is_active: boolean;
  sort_order: number;
  channel: "retail" | "wholesale";
}

function Toggle({
  enabled,
  onToggle,
  label,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          enabled ? "bg-brand-600" : "bg-slate-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      <span className="text-sm text-slate-700">{label}</span>
    </div>
  );
}

const VAT_OPTIONS = [
  { value: "0", label: "0% — Zero rated" },
  { value: "20", label: "20% — Standard rate" },
  { value: "5", label: "5% — Reduced rate" },
];

const SUBSCRIPTION_OPTIONS = [
  { value: "none", label: "None" },
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

interface WeightOption {
  weight_grams: number;
  unit: string;
  price: number | null;
}

interface MatrixCell {
  id?: string;
  sku: string | null;
  retail_stock_count: number | null;
  track_stock: boolean;
  is_active: boolean;
}

function emptyCell(): MatrixCell {
  return {
    sku: null,
    retail_stock_count: null,
    track_stock: false,
    is_active: true,
  };
}

function cellKey(weightGrams: number, grindTypeId: string): string {
  return `${weightGrams}:${grindTypeId}`;
}

type Tab = "overview" | "retail" | "wholesale";

const inputClassName =
  "w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent";

const labelClassName = "block text-sm font-medium text-slate-700 mb-1.5";

const sectionClassName = "border border-slate-200 rounded-lg p-5 space-y-5";

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const isEditing = !!product;

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Universal fields
  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [metaDescription, setMetaDescription] = useState(product?.meta_description || "");
  const [isRetail, setIsRetail] = useState(product?.is_retail ?? true);
  const [isWholesale, setIsWholesale] = useState(product?.is_wholesale ?? false);
  const [imageUrl, setImageUrl] = useState(product?.image_url || "");
  const [sku, setSku] = useState(product?.sku || "");
  const [unit, setUnit] = useState(product?.unit || "250g");
  const [weightGrams, setWeightGrams] = useState(product?.weight_grams?.toString() || "");
  const [vatRate, setVatRate] = useState(product?.vat_rate?.toString() || "0");
  const [sortOrder, setSortOrder] = useState(product?.sort_order?.toString() || "0");
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [isPurchasable, setIsPurchasable] = useState(product?.is_purchasable ?? true);

  // Retail fields
  const [retailPrice, setRetailPrice] = useState(product?.retail_price?.toString() || "");
  const [brand, setBrand] = useState(product?.brand || "");
  const [gtin, setGtin] = useState(product?.gtin || "");
  const [googleProductCategory, setGoogleProductCategory] = useState(
    product?.google_product_category || "Food, Beverages & Tobacco > Beverages > Coffee & Tea"
  );
  const [subscriptionFrequency, setSubscriptionFrequency] = useState(
    product?.subscription_frequency || "none"
  );
  const [trackStock, setTrackStock] = useState(product?.track_stock ?? false);
  const [stockCount, setStockCount] = useState(
    product?.retail_stock_count?.toString() || "0"
  );

  // Wholesale fields
  const [wholesalePrice, setWholesalePrice] = useState(
    product?.wholesale_price?.toString() || ""
  );
  const [rrp, setRrp] = useState(product?.rrp?.toString() || "");
  const [minWholesaleQty, setMinWholesaleQty] = useState(
    product?.minimum_wholesale_quantity?.toString() || "1"
  );
  const [orderMultiples, setOrderMultiples] = useState(
    product?.order_multiples?.toString() || ""
  );

  // Legacy price (kept in state but hidden from form)
  const [price] = useState(product?.price?.toString() || "");

  // Variant state — independent per channel
  const [retailVariantsEnabled, setRetailVariantsEnabled] = useState(false);
  const [wholesaleVariantsEnabled, setWholesaleVariantsEnabled] = useState(false);
  const [retailWeightOptions, setRetailWeightOptions] = useState<WeightOption[]>([]);
  const [wholesaleWeightOptions, setWholesaleWeightOptions] = useState<WeightOption[]>([]);
  const [retailSelectedGrindTypeIds, setRetailSelectedGrindTypeIds] = useState<Set<string>>(new Set());
  const [wholesaleSelectedGrindTypeIds, setWholesaleSelectedGrindTypeIds] = useState<Set<string>>(new Set());
  const [retailMatrixCells, setRetailMatrixCells] = useState<Record<string, MatrixCell>>({});
  const [wholesaleMatrixCells, setWholesaleMatrixCells] = useState<Record<string, MatrixCell>>({});
  const [expandedSkuCell, setExpandedSkuCell] = useState<string | null>(null);

  // Weight add form — per channel
  const [retailNewWeightGrams, setRetailNewWeightGrams] = useState("");
  const [retailNewWeightUnit, setRetailNewWeightUnit] = useState("");
  const [wholesaleNewWeightGrams, setWholesaleNewWeightGrams] = useState("");
  const [wholesaleNewWeightUnit, setWholesaleNewWeightUnit] = useState("");

  // Grind types
  const [grindTypes, setGrindTypes] = useState<GrindType[]>([]);
  const [grindTypesLoading, setGrindTypesLoading] = useState(true);
  const [newGrindTypeName, setNewGrindTypeName] = useState("");
  const [addingGrindType, setAddingGrindType] = useState(false);
  const [showInlineGrindAdd, setShowInlineGrindAdd] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch grind types on mount
  const loadGrindTypes = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/grind-types");
      if (res.ok) {
        const data = await res.json();
        setGrindTypes(data.grindTypes || []);
      }
    } catch {
      // Non-critical, grind types will just be empty
    }
    setGrindTypesLoading(false);
  }, []);

  // Fetch existing variants when editing — reconstruct per-channel matrices
  useEffect(() => {
    loadGrindTypes();

    if (isEditing) {
      fetch(`/api/products/${product.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.variants && data.variants.length > 0) {
            const variants: Variant[] = data.variants;

            const retailVars = variants.filter((v) => (v.channel || "retail") === "retail");
            const wholesaleVars = variants.filter((v) => v.channel === "wholesale");

            // Reconstruct retail
            if (retailVars.length > 0) {
              setRetailVariantsEnabled(true);
              const weightMap = new Map<number, { unit: string; price: number | null }>();
              const gtIds = new Set<string>();
              const cells: Record<string, MatrixCell> = {};
              for (const v of retailVars) {
                if (v.weight_grams != null && !weightMap.has(v.weight_grams)) {
                  weightMap.set(v.weight_grams, { unit: v.unit || `${v.weight_grams}g`, price: v.retail_price });
                }
                if (v.grind_type_id) gtIds.add(v.grind_type_id);
                if (v.weight_grams != null && v.grind_type_id) {
                  const key = cellKey(v.weight_grams, v.grind_type_id);
                  cells[key] = {
                    id: v.id,
                    sku: v.sku,
                    retail_stock_count: v.retail_stock_count,
                    track_stock: v.track_stock,
                    is_active: v.is_active,
                  };
                }
              }
              setRetailWeightOptions(
                Array.from(weightMap.entries()).map(([wg, info]) => ({ weight_grams: wg, unit: info.unit, price: info.price }))
              );
              setRetailSelectedGrindTypeIds(gtIds);
              setRetailMatrixCells(cells);
            }

            // Reconstruct wholesale
            if (wholesaleVars.length > 0) {
              setWholesaleVariantsEnabled(true);
              const weightMap = new Map<number, { unit: string; price: number | null }>();
              const gtIds = new Set<string>();
              const cells: Record<string, MatrixCell> = {};
              for (const v of wholesaleVars) {
                if (v.weight_grams != null && !weightMap.has(v.weight_grams)) {
                  weightMap.set(v.weight_grams, { unit: v.unit || `${v.weight_grams}g`, price: v.wholesale_price });
                }
                if (v.grind_type_id) gtIds.add(v.grind_type_id);
                if (v.weight_grams != null && v.grind_type_id) {
                  const key = cellKey(v.weight_grams, v.grind_type_id);
                  cells[key] = {
                    id: v.id,
                    sku: v.sku,
                    retail_stock_count: v.retail_stock_count,
                    track_stock: v.track_stock,
                    is_active: v.is_active,
                  };
                }
              }
              setWholesaleWeightOptions(
                Array.from(weightMap.entries()).map(([wg, info]) => ({ weight_grams: wg, unit: info.unit, price: info.price }))
              );
              setWholesaleSelectedGrindTypeIds(gtIds);
              setWholesaleMatrixCells(cells);
            }
          }
        })
        .catch(() => {
          // Non-critical
        });
    }
  }, [loadGrindTypes, isEditing, product?.id]);

  async function handleAddGrindType() {
    if (!newGrindTypeName.trim()) return;
    setAddingGrindType(true);
    try {
      const res = await fetch("/api/settings/grind-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGrindTypeName.trim(), sort_order: grindTypes.length }),
      });
      if (res.ok) {
        const data = await res.json();
        setGrindTypes((prev) => [...prev, data.grindType]);
        setNewGrindTypeName("");
        setShowInlineGrindAdd(false);
        // Auto-select in the active channel
        if (activeTab === "retail") {
          setRetailSelectedGrindTypeIds((prev) => new Set([...Array.from(prev), data.grindType.id]));
        } else if (activeTab === "wholesale") {
          setWholesaleSelectedGrindTypeIds((prev) => new Set([...Array.from(prev), data.grindType.id]));
        }
      }
    } catch {
      // Silently fail
    }
    setAddingGrindType(false);
  }

  function handleAddWeight(channel: "retail" | "wholesale") {
    const newGrams = channel === "retail" ? retailNewWeightGrams : wholesaleNewWeightGrams;
    const newUnit = channel === "retail" ? retailNewWeightUnit : wholesaleNewWeightUnit;
    const weightOpts = channel === "retail" ? retailWeightOptions : wholesaleWeightOptions;
    const setter = channel === "retail" ? setRetailWeightOptions : setWholesaleWeightOptions;
    const setGrams = channel === "retail" ? setRetailNewWeightGrams : setWholesaleNewWeightGrams;
    const setUnitVal = channel === "retail" ? setRetailNewWeightUnit : setWholesaleNewWeightUnit;

    const grams = parseInt(newGrams);
    if (!grams || grams <= 0) return;
    const unitLabel = newUnit.trim() || `${grams}g`;
    if (weightOpts.some((w) => w.weight_grams === grams)) return;
    setter((prev) => [...prev, { weight_grams: grams, unit: unitLabel, price: null }]);
    setGrams("");
    setUnitVal("");
  }

  function handleRemoveWeight(channel: "retail" | "wholesale", grams: number) {
    const setter = channel === "retail" ? setRetailWeightOptions : setWholesaleWeightOptions;
    setter((prev) => prev.filter((w) => w.weight_grams !== grams));
  }

  function handleToggleGrindType(channel: "retail" | "wholesale", gtId: string) {
    const setter = channel === "retail" ? setRetailSelectedGrindTypeIds : setWholesaleSelectedGrindTypeIds;
    setter((prev) => {
      const next = new Set(Array.from(prev));
      if (next.has(gtId)) {
        next.delete(gtId);
      } else {
        next.add(gtId);
      }
      return next;
    });
  }

  function getCell(channel: "retail" | "wholesale", key: string): MatrixCell {
    const cells = channel === "retail" ? retailMatrixCells : wholesaleMatrixCells;
    return cells[key] || emptyCell();
  }

  function updateCell(channel: "retail" | "wholesale", key: string, updates: Partial<MatrixCell>) {
    const setter = channel === "retail" ? setRetailMatrixCells : setWholesaleMatrixCells;
    setter((prev) => ({
      ...prev,
      [key]: { ...getCell(channel, key), ...updates },
    }));
  }

  function handleCopyVariantConfig(from: "retail" | "wholesale") {
    if (from === "retail") {
      // Copy retail config → wholesale (reset prices since channel differs)
      setWholesaleWeightOptions(retailWeightOptions.map((w) => ({ ...w, price: null })));
      setWholesaleSelectedGrindTypeIds(new Set(Array.from(retailSelectedGrindTypeIds)));
      setWholesaleMatrixCells({});
    } else {
      // Copy wholesale config → retail (reset prices since channel differs)
      setRetailWeightOptions(wholesaleWeightOptions.map((w) => ({ ...w, price: null })));
      setRetailSelectedGrindTypeIds(new Set(Array.from(wholesaleSelectedGrindTypeIds)));
      setRetailMatrixCells({});
    }
  }

  // Channel-specific derived values
  const retailSelectedGrindTypes = grindTypes.filter((gt) => retailSelectedGrindTypeIds.has(gt.id));
  const wholesaleSelectedGrindTypes = grindTypes.filter((gt) => wholesaleSelectedGrindTypeIds.has(gt.id));
  const retailShowMatrix = retailWeightOptions.length > 0 && retailSelectedGrindTypes.length > 0;
  const wholesaleShowMatrix = wholesaleWeightOptions.length > 0 && wholesaleSelectedGrindTypes.length > 0;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    // Reset the input so the same file can be re-selected
    e.target.value = "";

    setIsUploading(true);
    setError(null);

    const file = await compressImage(rawFile);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to upload image");
        setIsUploading(false);
        return;
      }

      setImageUrl(data.url);
    } catch {
      setError("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const body: Record<string, unknown> = {
      name,
      description: description || null,
      meta_description: metaDescription || null,
      price: parseFloat(price) || 0,
      unit,
      image_url: imageUrl || null,
      is_active: isActive,
      sort_order: parseInt(sortOrder) || 0,
      is_retail: isRetail,
      is_wholesale: isWholesale,
      retail_price: isRetail && retailPrice ? parseFloat(retailPrice) : null,
      wholesale_price: isWholesale && wholesalePrice ? parseFloat(wholesalePrice) : null,
      minimum_wholesale_quantity: isWholesale ? parseInt(minWholesaleQty) || 1 : 1,
      sku: sku || null,
      weight_grams: weightGrams ? parseInt(weightGrams) : null,
      is_purchasable: isPurchasable,
      track_stock: trackStock,
      retail_stock_count: trackStock ? parseInt(stockCount) || 0 : null,
      brand: isRetail ? brand || null : null,
      gtin: isRetail ? gtin || null : null,
      google_product_category: isRetail ? googleProductCategory || null : null,
      vat_rate: parseFloat(vatRate) || 0,
      rrp: isWholesale && rrp ? parseFloat(rrp) : null,
      order_multiples: isWholesale && orderMultiples ? parseInt(orderMultiples) : null,
      subscription_frequency: isRetail && subscriptionFrequency !== "none" ? subscriptionFrequency : null,
    };

    // Convert per-channel matrices to flat variants array
    const flatVariants: Record<string, unknown>[] = [];

    if (retailVariantsEnabled && retailShowMatrix && isRetail) {
      retailWeightOptions.forEach((w, rowIdx) => {
        retailSelectedGrindTypes.forEach((gt, colIdx) => {
          const key = cellKey(w.weight_grams, gt.id);
          const cell = retailMatrixCells[key] || emptyCell();
          flatVariants.push({
            id: cell.id || undefined,
            weight_grams: w.weight_grams,
            unit: w.unit,
            grind_type_id: gt.id,
            sku: cell.sku,
            retail_price: w.price,
            wholesale_price: null,
            retail_stock_count: cell.retail_stock_count,
            track_stock: cell.track_stock,
            is_active: cell.is_active,
            sort_order: rowIdx * 100 + colIdx,
            channel: "retail",
          });
        });
      });
    }

    if (wholesaleVariantsEnabled && wholesaleShowMatrix && isWholesale) {
      wholesaleWeightOptions.forEach((w, rowIdx) => {
        wholesaleSelectedGrindTypes.forEach((gt, colIdx) => {
          const key = cellKey(w.weight_grams, gt.id);
          const cell = wholesaleMatrixCells[key] || emptyCell();
          flatVariants.push({
            id: cell.id || undefined,
            weight_grams: w.weight_grams,
            unit: w.unit,
            grind_type_id: gt.id,
            sku: cell.sku,
            retail_price: null,
            wholesale_price: w.price,
            retail_stock_count: cell.retail_stock_count,
            track_stock: cell.track_stock,
            is_active: cell.is_active,
            sort_order: rowIdx * 100 + colIdx,
            channel: "wholesale",
          });
        });
      });
    }

    if (flatVariants.length > 0 || isEditing) {
      body.variants = flatVariants;
    }

    try {
      const res = await fetch(
        isEditing ? `/api/products/${product.id}` : "/api/products",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save product");
        setIsLoading(false);
        return;
      }

      router.push("/products");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }

  // Tabs to show
  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: "overview", label: "Overview", show: true },
    { key: "retail", label: "Retail", show: isRetail },
    { key: "wholesale", label: "Wholesale", show: isWholesale },
  ];

  // Reset to overview if current tab becomes hidden
  useEffect(() => {
    if (activeTab === "retail" && !isRetail) setActiveTab("overview");
    if (activeTab === "wholesale" && !isWholesale) setActiveTab("overview");
  }, [isRetail, isWholesale, activeTab]);

  // ─── Variant Options Panel Renderer ───
  function renderVariantOptions(channel: "retail" | "wholesale") {
    const weightOpts = channel === "retail" ? retailWeightOptions : wholesaleWeightOptions;
    const selectedGtIds = channel === "retail" ? retailSelectedGrindTypeIds : wholesaleSelectedGrindTypeIds;
    const newWG = channel === "retail" ? retailNewWeightGrams : wholesaleNewWeightGrams;
    const setNewWG = channel === "retail" ? setRetailNewWeightGrams : setWholesaleNewWeightGrams;
    const newWU = channel === "retail" ? retailNewWeightUnit : wholesaleNewWeightUnit;
    const setNewWU = channel === "retail" ? setRetailNewWeightUnit : setWholesaleNewWeightUnit;
    const otherChannel = channel === "retail" ? "wholesale" : "retail";
    const otherLabel = channel === "retail" ? "Wholesale" : "Retail";
    const otherEnabled = channel === "retail" ? (isWholesale && wholesaleVariantsEnabled) : (isRetail && retailVariantsEnabled);
    const otherHasConfig = channel === "retail"
      ? (wholesaleWeightOptions.length > 0 || wholesaleSelectedGrindTypeIds.size > 0)
      : (retailWeightOptions.length > 0 || retailSelectedGrindTypeIds.size > 0);

    return (
      <div className={sectionClassName}>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-800">Define Options</h4>
          {otherEnabled && otherHasConfig && (
            <button
              type="button"
              onClick={() => handleCopyVariantConfig(otherChannel as "retail" | "wholesale")}
              className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              <Copy className="w-3.5 h-3.5" />
              {`Copy from ${otherLabel}`}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-6">
          {/* Panel 1 — Weights */}
          <div className="space-y-3">
            <label className={labelClassName}>Weight options</label>
            {weightOpts.length > 0 && (
              <div className="space-y-1.5">
                {weightOpts.map((w, idx) => {
                  const setter = channel === "retail" ? setRetailWeightOptions : setWholesaleWeightOptions;
                  return (
                    <div
                      key={w.weight_grams}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white"
                    >
                      <span className="text-sm text-slate-900 whitespace-nowrap">
                        {w.unit}
                        {w.unit !== `${w.weight_grams}g` && (
                          <span className="text-slate-400 ml-1.5">{`— ${w.weight_grams}g`}</span>
                        )}
                      </span>
                      <div className="flex items-center gap-1 ml-auto">
                        <span className="text-xs text-slate-500">£</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={w.price ?? ""}
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : null;
                            setter((prev) => prev.map((opt, i) => i === idx ? { ...opt, price: val } : opt));
                          }}
                          placeholder="Price"
                          className="w-20 px-2 py-1 border border-slate-300 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveWeight(channel, w.weight_grams)}
                        className="p-0.5 text-slate-400 hover:text-red-500 flex-shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">Weight (g)</label>
                <input
                  type="number"
                  min="1"
                  value={newWG}
                  onChange={(e) => setNewWG(e.target.value)}
                  placeholder="250"
                  className={inputClassName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddWeight(channel);
                    }
                  }}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">Unit label</label>
                <input
                  type="text"
                  value={newWU}
                  onChange={(e) => setNewWU(e.target.value)}
                  placeholder="e.g. 250g, 1kg"
                  className={inputClassName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddWeight(channel);
                    }
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => handleAddWeight(channel)}
                disabled={!newWG || parseInt(newWG) <= 0}
                className="px-3 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          {/* Panel 2 — Grind Types */}
          <div className="space-y-3">
            <label className={labelClassName}>Grind type options</label>
            {!grindTypesLoading && grindTypes.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  No grind types set up. You can add them in{" "}
                  <Link href="/settings/grind-types" className="text-brand-600 hover:text-brand-700 font-medium">
                    Settings
                  </Link>
                  , or add one below.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={newGrindTypeName}
                    onChange={(e) => setNewGrindTypeName(e.target.value)}
                    placeholder="e.g. Whole Bean"
                    className={`${inputClassName} max-w-[200px]`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddGrindType();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddGrindType}
                    disabled={addingGrindType || !newGrindTypeName.trim()}
                    className="px-3 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                  >
                    {addingGrindType ? "Adding..." : "Add"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  {grindTypes.map((gt) => (
                    <label
                      key={gt.id}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-200 bg-white cursor-pointer hover:border-slate-300 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGtIds.has(gt.id)}
                        onChange={() => handleToggleGrindType(channel, gt.id)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-slate-900">{gt.name}</span>
                    </label>
                  ))}
                </div>
                {/* Inline add new grind type */}
                {showInlineGrindAdd ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newGrindTypeName}
                      onChange={(e) => setNewGrindTypeName(e.target.value)}
                      placeholder="e.g. Espresso"
                      className={`${inputClassName} max-w-[180px]`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddGrindType();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddGrindType}
                      disabled={addingGrindType || !newGrindTypeName.trim()}
                      className="px-3 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                    >
                      {addingGrindType ? "..." : "Add"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowInlineGrindAdd(false);
                        setNewGrindTypeName("");
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowInlineGrindAdd(true)}
                    className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                  >
                    + Add new grind type
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Variant Matrix Renderer ───
  function renderMatrix(channel: "retail" | "wholesale") {
    const weightOpts = channel === "retail" ? retailWeightOptions : wholesaleWeightOptions;
    const selectedGTs = channel === "retail" ? retailSelectedGrindTypes : wholesaleSelectedGrindTypes;
    const showMx = channel === "retail" ? retailShowMatrix : wholesaleShowMatrix;

    if (!showMx) return null;

    const channelLabel = channel === "retail" ? "Retail" : "Wholesale";
    const cells = channel === "retail" ? retailMatrixCells : wholesaleMatrixCells;
    const hasCells = Object.keys(cells).length > 0;

    return (
      <div className={sectionClassName}>
        <h4 className="text-sm font-semibold text-slate-800">
          {`${channelLabel} Combinations (${weightOpts.length * selectedGTs.length})`}
        </h4>
        {!hasCells && (
          <p className="text-xs text-slate-500">
            Configure SKU and active status for each weight/grind combination. Pricing is set per weight above.
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 pr-4 font-medium text-slate-500 text-xs uppercase tracking-wide">
                  Weight
                </th>
                {selectedGTs.map((gt) => (
                  <th
                    key={gt.id}
                    className="text-left py-2 px-3 font-medium text-slate-500 text-xs uppercase tracking-wide"
                  >
                    {gt.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weightOpts.map((w) => (
                <tr key={w.weight_grams} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 pr-4 font-medium text-slate-900 align-top whitespace-nowrap">
                    {w.unit}
                  </td>
                  {selectedGTs.map((gt) => {
                    const key = cellKey(w.weight_grams, gt.id);
                    const cell = getCell(channel, key);
                    const cellExpandKey = `${channel}:${key}`;
                    const isSkuExpanded = expandedSkuCell === cellExpandKey;
                    return (
                      <td key={gt.id} className="py-3 px-3 align-top">
                        <div className="space-y-2">
                          {/* Active toggle */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                updateCell(channel, key, { is_active: !cell.is_active })
                              }
                              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                                cell.is_active ? "bg-brand-600" : "bg-slate-200"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                                  cell.is_active
                                    ? "translate-x-4"
                                    : "translate-x-0"
                                }`}
                              />
                            </button>
                            <span className={`text-xs ${cell.is_active ? "text-green-700" : "text-slate-400"}`}>
                              {cell.is_active ? "Active" : "Off"}
                            </span>
                          </div>

                          {/* SKU link / field */}
                          {isSkuExpanded || cell.sku ? (
                            <input
                              type="text"
                              value={cell.sku || ""}
                              onChange={(e) =>
                                updateCell(channel, key, {
                                  sku: e.target.value || null,
                                })
                              }
                              placeholder="SKU"
                              className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                              onBlur={() => {
                                if (!cell.sku) setExpandedSkuCell(null);
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setExpandedSkuCell(cellExpandKey)}
                              className="text-xs text-slate-400 hover:text-slate-600"
                            >
                              + SKU
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/products"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">
          {isEditing ? "Edit Product" : "Add Product"}
        </h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 max-w-2xl">
        {/* ─── Tab Navigation ─── */}
        <div className="border-b border-slate-200 px-6">
          <nav className="-mb-px flex gap-6">
            {tabs.filter((t) => t.show).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-brand-600 text-brand-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ═══════════════ OVERVIEW TAB ═══════════════ */}
            {activeTab === "overview" && (
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-4">General</h3>
                <div className={sectionClassName}>
                  {/* Product Name */}
                  <div>
                    <label className={labelClassName}>Product Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ethiopian Yirgacheffe"
                      required
                      className={inputClassName}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className={labelClassName}>
                        Description{" "}
                        <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <AiGenerateButton
                        type="product_description"
                        context={{ existingContent: description, productCategory: "coffee" }}
                        onSelect={setDescription}
                        enableShortcut
                      />
                    </div>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tasting notes, origin details..."
                      rows={3}
                      className={inputClassName}
                    />
                  </div>

                  {/* Meta Description */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className={labelClassName}>
                        Meta Description{" "}
                        <span className="text-slate-400 font-normal">(SEO)</span>
                      </label>
                      <AiGenerateButton
                        type="product_meta_description"
                        context={{ existingContent: metaDescription, productCategory: "coffee" }}
                        onSelect={setMetaDescription}
                      />
                    </div>
                    <textarea
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      placeholder="Brief SEO description for search engines..."
                      rows={2}
                      maxLength={155}
                      className={inputClassName}
                    />
                    <p className={`text-xs mt-1 ${metaDescription.length > 155 ? "text-red-500" : metaDescription.length > 120 ? "text-amber-500" : "text-slate-400"}`}>
                      {`${metaDescription.length}/155 characters`}
                    </p>
                  </div>

                  {/* Channel Toggles */}
                  <div>
                    <label className={labelClassName}>Channels</label>
                    <div className="flex gap-4">
                      <label
                        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                          isRetail
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-slate-300 text-slate-600 hover:border-slate-400"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isRetail}
                          onChange={() => setIsRetail(!isRetail)}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-sm font-medium">Retail</span>
                      </label>
                      <label
                        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                          isWholesale
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-slate-300 text-slate-600 hover:border-slate-400"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isWholesale}
                          onChange={() => setIsWholesale(!isWholesale)}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-sm font-medium">Wholesale</span>
                      </label>
                    </div>
                    {!isRetail && !isWholesale && (
                      <p className="text-xs text-amber-600 mt-1.5">
                        At least one channel should be selected.
                      </p>
                    )}
                  </div>

                  {/* Product Image */}
                  <div>
                    <label className={labelClassName}>
                      Product Image{" "}
                      <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {imageUrl ? (
                      <div className="relative inline-block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl}
                          alt="Product preview"
                          className="w-40 h-40 object-cover rounded-lg border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => setImageUrl("")}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
                        >
                          Replace image
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full border-2 border-dashed border-slate-300 rounded-lg py-8 px-4 flex flex-col items-center gap-2 text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors disabled:opacity-50"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span className="text-sm font-medium">Uploading…</span>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                              <ImageIcon className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-medium">Click to upload an image</span>
                            <span className="text-xs">JPG, PNG or WebP — max 5MB</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* SKU & VAT */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClassName}>
                        SKU{" "}
                        <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="GR-ETH-250"
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <label className={labelClassName}>VAT Rate</label>
                      <select
                        value={vatRate}
                        onChange={(e) => setVatRate(e.target.value)}
                        className={inputClassName}
                      >
                        {VAT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Sort Order */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClassName}>Sort Order</label>
                      <input
                        type="number"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        placeholder="0"
                        className={inputClassName}
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Lower numbers appear first.
                      </p>
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="space-y-3 pt-1">
                    <Toggle
                      enabled={isActive}
                      onToggle={() => setIsActive(!isActive)}
                      label={
                        isActive
                          ? "Active — visible to customers"
                          : "Inactive — hidden from customers"
                      }
                    />
                    <Toggle
                      enabled={isPurchasable}
                      onToggle={() => setIsPurchasable(!isPurchasable)}
                      label={
                        isPurchasable
                          ? "Purchasable — customers can buy online"
                          : "Not purchasable — enquiry only"
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════ RETAIL TAB ═══════════════ */}
            {activeTab === "retail" && isRetail && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">Retail Pricing</h3>
                  <div className={sectionClassName}>
                    {/* Retail Price */}
                    <div>
                      <label className={labelClassName}>Retail Price (£)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={retailPrice}
                        onChange={(e) => setRetailPrice(e.target.value)}
                        placeholder="8.50"
                        className={`${inputClassName} max-w-[200px]`}
                      />
                    </div>

                    {/* Brand & GTIN */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClassName}>
                          Brand{" "}
                          <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={brand}
                          onChange={(e) => setBrand(e.target.value)}
                          placeholder="Your brand name"
                          className={inputClassName}
                        />
                      </div>
                      <div>
                        <label className={labelClassName}>
                          GTIN / Barcode{" "}
                          <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={gtin}
                          onChange={(e) => setGtin(e.target.value)}
                          placeholder="0123456789012"
                          className={inputClassName}
                        />
                      </div>
                    </div>

                    {/* Google Product Category */}
                    <div>
                      <label className={labelClassName}>
                        Google Product Category{" "}
                        <span className="text-slate-400 font-normal">(for feeds)</span>
                      </label>
                      <input
                        type="text"
                        value={googleProductCategory}
                        onChange={(e) => setGoogleProductCategory(e.target.value)}
                        placeholder="Food, Beverages & Tobacco > Beverages > Coffee & Tea"
                        className={inputClassName}
                      />
                    </div>

                    {/* Subscription Frequency */}
                    <div>
                      <label className={labelClassName}>Subscription Frequency</label>
                      <select
                        value={subscriptionFrequency}
                        onChange={(e) => setSubscriptionFrequency(e.target.value)}
                        className={`${inputClassName} max-w-[200px]`}
                      >
                        {SUBSCRIPTION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Stock Tracking */}
                    <div className="space-y-3">
                      <Toggle
                        enabled={trackStock}
                        onToggle={() => setTrackStock(!trackStock)}
                        label={trackStock ? "Stock tracking enabled" : "Stock tracking disabled"}
                      />
                      {trackStock && (
                        <div>
                          <label className={labelClassName}>Stock Count</label>
                          <input
                            type="number"
                            min="0"
                            value={stockCount}
                            onChange={(e) => setStockCount(e.target.value)}
                            placeholder="0"
                            className={`${inputClassName} max-w-[120px]`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Retail Variants */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-800">Retail Variants</h3>
                    <Toggle
                      enabled={retailVariantsEnabled}
                      onToggle={() => setRetailVariantsEnabled(!retailVariantsEnabled)}
                      label={retailVariantsEnabled ? "Enabled" : "Disabled"}
                    />
                  </div>
                  {retailVariantsEnabled && (
                    <div className="space-y-5">
                      {renderVariantOptions("retail")}
                      {renderMatrix("retail")}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══════════════ WHOLESALE TAB ═══════════════ */}
            {activeTab === "wholesale" && isWholesale && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">Wholesale Pricing</h3>
                  <div className={sectionClassName}>
                    {/* Wholesale Price & RRP */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClassName}>Wholesale Price (£)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={wholesalePrice}
                          onChange={(e) => setWholesalePrice(e.target.value)}
                          placeholder="6.00"
                          className={inputClassName}
                        />
                      </div>
                      <div>
                        <label className={labelClassName}>
                          RRP (£){" "}
                          <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={rrp}
                          onChange={(e) => setRrp(e.target.value)}
                          placeholder="9.99"
                          className={inputClassName}
                        />
                      </div>
                    </div>

                    {/* Min Qty & Order Multiples */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClassName}>Minimum Order Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={minWholesaleQty}
                          onChange={(e) => setMinWholesaleQty(e.target.value)}
                          placeholder="1"
                          className={inputClassName}
                        />
                      </div>
                      <div>
                        <label className={labelClassName}>
                          Order Multiples{" "}
                          <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={orderMultiples}
                          onChange={(e) => setOrderMultiples(e.target.value)}
                          placeholder="e.g. 6"
                          className={inputClassName}
                        />
                        <p className="text-xs text-slate-400 mt-1">
                          Customers must order in multiples of this number.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wholesale Variants */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-800">Wholesale Variants</h3>
                    <Toggle
                      enabled={wholesaleVariantsEnabled}
                      onToggle={() => setWholesaleVariantsEnabled(!wholesaleVariantsEnabled)}
                      label={wholesaleVariantsEnabled ? "Enabled" : "Disabled"}
                    />
                  </div>
                  {wholesaleVariantsEnabled && (
                    <div className="space-y-5">
                      {renderVariantOptions("wholesale")}
                      {renderMatrix("wholesale")}
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving…
                  </>
                ) : isEditing ? (
                  "Save Changes"
                ) : (
                  "Add Product"
                )}
              </button>
              <Link
                href="/products"
                className="px-6 py-2.5 text-slate-600 rounded-lg font-medium hover:bg-slate-100 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
