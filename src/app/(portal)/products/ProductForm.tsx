"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  X,
  ImageIcon,
  Copy,
  Coffee as CoffeeIcon,
  Package,
} from "@/components/icons";
import Link from "next/link";
import { RETAIL_ENABLED } from "@/lib/feature-flags";
import { AiGenerateButton } from "@/components/AiGenerateButton";
import { compressImage } from "@/lib/compress-image";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";


interface Product {
  id: string;
  name: string;
  category: "coffee" | "other";
  origin: string | null;
  tasting_notes: string | null;
  description: string | null;
  meta_description: string | null;
  price: number;
  unit: string;
  image_url: string | null;
  status: "draft" | "published";
  sort_order: number;
  is_retail: boolean;
  is_wholesale: boolean;
  product_type: "retail" | "wholesale" | "both";
  retail_price: number | null;
  wholesale_price: number | null;
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

interface OptionValue {
  id?: string;
  value: string;
}

interface OptionType {
  id?: string;
  name: string;
  values: OptionValue[];
}

interface OtherVariantCell {
  id?: string;
  label: string;
  optionValueIds: string[];
  retailPrice: string;
  wholesalePrice: string;
  sku: string;
  trackStock: boolean;
  stockCount: string;
  isActive: boolean;
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

function SortableGrindItem({
  gt,
  checked,
  onToggle,
}: {
  gt: GrindType;
  checked: boolean;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: gt.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="shrink-0 w-5 h-5 flex items-center justify-center text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="9" cy="6" r="1.5" />
          <circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" />
          <circle cx="15" cy="18" r="1.5" />
        </svg>
      </button>
      <label className="flex items-center gap-2.5 cursor-pointer flex-1">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm text-slate-900">{gt.name}</span>
      </label>
    </div>
  );
}

type Tab = "overview" | "retail" | "wholesale";

const inputClassName =
  "w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent";

const labelClassName = "block text-sm font-medium text-slate-700 mb-1.5";

const sectionClassName = "border border-slate-200 rounded-lg p-5 space-y-5";

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const isEditing = !!product;

  // Category (set on create, read-only on edit)
  const [category, setCategory] = useState<"coffee" | "other">(product?.category ?? "coffee");

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Universal fields
  const [name, setName] = useState(product?.name || "");
  const [origin, setOrigin] = useState(product?.origin || "");
  const [tastingNotes, setTastingNotes] = useState(product?.tasting_notes || "");
  const [description, setDescription] = useState(product?.description || "");
  const [metaDescription, setMetaDescription] = useState(product?.meta_description || "");
  const [isRetail, setIsRetail] = useState(product?.is_retail ?? RETAIL_ENABLED);
  const [isWholesale, setIsWholesale] = useState(product?.is_wholesale ?? true);
  const [imageUrl, setImageUrl] = useState(product?.image_url || "");
  const [sku, setSku] = useState(product?.sku || "");
  const [unit, setUnit] = useState(product?.unit || "250g");
  const [weightGrams, setWeightGrams] = useState(product?.weight_grams?.toString() || "");
  const [vatRate, setVatRate] = useState(product?.vat_rate?.toString() || "0");
  const [status, setStatus] = useState<"draft" | "published">(product?.status ?? "published");
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

  // "Other" product option types & variant cells
  const [optionTypes, setOptionTypes] = useState<OptionType[]>([]);
  const [otherVariantCells, setOtherVariantCells] = useState<OtherVariantCell[]>([]);

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

  // DnD sensors for grind type reorder
  const grindSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

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

          // Reconstruct "other" product option types + variant cells
          if (data.option_types && data.option_types.length > 0) {
            const loadedTypes: OptionType[] = data.option_types.map(
              (ot: { id: string; name: string; values: { id: string; value: string }[] }) => ({
                id: ot.id,
                name: ot.name,
                values: ot.values.map((v) => ({ id: v.id, value: v.value })),
              })
            );
            setOptionTypes(loadedTypes);

            // Reconstruct variant cells from variants with option_value_ids
            if (data.variants && data.variants.length > 0) {
              const cells: OtherVariantCell[] = data.variants.map(
                (v: Variant & { option_value_ids?: string[] }) => ({
                  id: v.id,
                  label: v.unit || "",
                  optionValueIds: v.option_value_ids || [],
                  retailPrice: v.retail_price?.toString() || "",
                  wholesalePrice: v.wholesale_price?.toString() || "",
                  sku: v.sku || "",
                  trackStock: v.track_stock,
                  stockCount: v.retail_stock_count?.toString() || "",
                  isActive: v.is_active,
                })
              );
              setOtherVariantCells(cells);
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

  async function handleGrindDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = grindTypes.findIndex((gt) => gt.id === active.id);
    const newIndex = grindTypes.findIndex((gt) => gt.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(grindTypes, oldIndex, newIndex);
    setGrindTypes(reordered);

    // Persist new sort_order for each affected item
    const minIdx = Math.min(oldIndex, newIndex);
    const maxIdx = Math.max(oldIndex, newIndex);
    for (let i = minIdx; i <= maxIdx; i++) {
      fetch(`/api/settings/grind-types/${reordered[i].id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: reordered[i].name, sort_order: i }),
      });
    }
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

  // ─── Option Type Helpers (for "other" products) ───
  function handleAddOptionType() {
    if (optionTypes.length >= 3) return;
    setOptionTypes((prev) => [...prev, { name: "", values: [] }]);
  }

  function handleRemoveOptionType(idx: number) {
    setOptionTypes((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleOptionTypeName(idx: number, name: string) {
    setOptionTypes((prev) => prev.map((ot, i) => (i === idx ? { ...ot, name } : ot)));
  }

  function handleAddOptionValue(typeIdx: number, value: string) {
    if (!value.trim()) return;
    setOptionTypes((prev) =>
      prev.map((ot, i) =>
        i === typeIdx ? { ...ot, values: [...ot.values, { value: value.trim() }] } : ot
      )
    );
  }

  function handleRemoveOptionValue(typeIdx: number, valIdx: number) {
    setOptionTypes((prev) =>
      prev.map((ot, i) =>
        i === typeIdx ? { ...ot, values: ot.values.filter((_, vi) => vi !== valIdx) } : ot
      )
    );
  }

  // Compute cartesian product combos from option types (always up-to-date via useMemo)
  const otherVariantCombos = useMemo(() => {
    const validTypes = optionTypes.filter((ot) => ot.name.trim() && ot.values.length > 0);
    if (validTypes.length === 0) return [];

    let combos: { label: string; optionValueIds: string[] }[] = [{ label: "", optionValueIds: [] }];
    for (const ot of validTypes) {
      const next: { label: string; optionValueIds: string[] }[] = [];
      for (const combo of combos) {
        for (const val of ot.values) {
          next.push({
            label: combo.label ? `${combo.label} / ${val.value}` : val.value,
            optionValueIds: [...combo.optionValueIds, val.id || val.value],
          });
        }
      }
      combos = next;
    }
    return combos;
  }, [optionTypes]);

  // Sync variant cells whenever combos change — preserves user-entered data by label
  useEffect(() => {
    setOtherVariantCells((prev) => {
      if (otherVariantCombos.length === 0) return prev.length === 0 ? prev : [];
      const existingByLabel = new Map(prev.map((c) => [c.label, c]));
      return otherVariantCombos.map((combo) => {
        const existing = existingByLabel.get(combo.label);
        return existing
          ? { ...existing, optionValueIds: combo.optionValueIds }
          : {
              label: combo.label,
              optionValueIds: combo.optionValueIds,
              retailPrice: "",
              wholesalePrice: "",
              sku: "",
              trackStock: false,
              stockCount: "",
              isActive: false,
            };
      });
    });
  }, [otherVariantCombos]);

  function updateOtherVariantCell(idx: number, updates: Partial<OtherVariantCell>) {
    setOtherVariantCells((prev) => prev.map((c, i) => (i === idx ? { ...c, ...updates } : c)));
  }

  // ─── Option Builder Renderer ───
  function renderOptionBuilder() {
    return (
      <div className={sectionClassName}>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-800">Option Types</h4>
          {optionTypes.length < 3 && (
            <button
              type="button"
              onClick={handleAddOptionType}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              + Add option type
            </button>
          )}
        </div>
        {optionTypes.length === 0 && (
          <p className="text-sm text-slate-500">
            Add option types (e.g. Size, Colour) to create product variants. Max 3.
          </p>
        )}
        {optionTypes.map((ot, typeIdx) => (
          <div key={typeIdx} className="border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={ot.name}
                onChange={(e) => handleOptionTypeName(typeIdx, e.target.value)}
                placeholder="e.g. Size, Colour, Flavour"
                className={`${inputClassName} flex-1`}
              />
              <button
                type="button"
                onClick={() => handleRemoveOptionType(typeIdx)}
                className="p-1.5 text-slate-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {ot.values.map((val, valIdx) => (
                <span
                  key={valIdx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-sm"
                >
                  {val.value}
                  <button
                    type="button"
                    onClick={() => handleRemoveOptionValue(typeIdx, valIdx)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Type a value & press Enter"
                className="px-2.5 py-1 border border-dashed border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 min-w-[160px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const input = e.currentTarget;
                    handleAddOptionValue(typeIdx, input.value);
                    input.value = "";
                  }
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ─── Other Variant Grid Renderer ───
  function renderOtherVariantGrid(channel: "retail" | "wholesale" | "both") {
    if (otherVariantCells.length === 0) return null;

    return (
      <div className={sectionClassName}>
        <h4 className="text-sm font-semibold text-slate-800">
          {`Variant Combinations (${otherVariantCells.length})`}
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 pr-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Variant</th>
                {(channel === "retail" || channel === "both") && (
                  <th className="text-left py-2 px-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Retail £</th>
                )}
                {(channel === "wholesale" || channel === "both") && (
                  <th className="text-left py-2 px-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Wholesale £</th>
                )}
                <th className="text-left py-2 px-3 font-medium text-slate-500 text-xs uppercase tracking-wide">SKU</th>
                <th className="text-left py-2 px-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Stock</th>
                <th className="text-center py-2 px-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Active</th>
              </tr>
            </thead>
            <tbody>
              {otherVariantCells.map((cell, idx) => (
                <tr key={cell.label} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5 pr-3 font-medium text-slate-900 whitespace-nowrap">{cell.label}</td>
                  {(channel === "retail" || channel === "both") && (
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={cell.retailPrice}
                        onChange={(e) => updateOtherVariantCell(idx, { retailPrice: e.target.value })}
                        placeholder="0.00"
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </td>
                  )}
                  {(channel === "wholesale" || channel === "both") && (
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={cell.wholesalePrice}
                        onChange={(e) => updateOtherVariantCell(idx, { wholesalePrice: e.target.value })}
                        placeholder="0.00"
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </td>
                  )}
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={cell.sku}
                      onChange={(e) => updateOtherVariantCell(idx, { sku: e.target.value })}
                      placeholder="SKU"
                      className="w-24 px-2 py-1 border border-slate-300 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateOtherVariantCell(idx, { trackStock: !cell.trackStock, stockCount: cell.trackStock ? "" : cell.stockCount })}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                          cell.trackStock ? "bg-brand-600" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                            cell.trackStock ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                      {cell.trackStock && (
                        <input
                          type="number"
                          min="0"
                          value={cell.stockCount}
                          onChange={(e) => updateOtherVariantCell(idx, { stockCount: e.target.value })}
                          placeholder="0"
                          className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => updateOtherVariantCell(idx, { isActive: !cell.isActive })}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        cell.isActive ? "bg-brand-600" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                          cell.isActive ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const body: Record<string, unknown> = {
      name,
      ...(!isEditing && { category }),
      origin: category === "coffee" ? origin || null : null,
      tasting_notes: category === "coffee" ? tastingNotes || null : null,
      description: description || null,
      meta_description: metaDescription || null,
      price: parseFloat(price) || 0,
      unit,
      image_url: imageUrl || null,
      status,
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

    // "Other" products: build variants from option-based cells
    if (category === "other" && otherVariantCells.length > 0) {
      otherVariantCells.forEach((cell, idx) => {
        flatVariants.push({
          id: cell.id || undefined,
          weight_grams: null,
          unit: cell.label,
          grind_type_id: null,
          sku: cell.sku || null,
          retail_price: cell.retailPrice ? parseFloat(cell.retailPrice) : null,
          wholesale_price: cell.wholesalePrice ? parseFloat(cell.wholesalePrice) : null,
          retail_stock_count: cell.trackStock ? parseInt(cell.stockCount) || 0 : null,
          track_stock: cell.trackStock,
          is_active: cell.isActive,
          sort_order: idx,
          channel: "retail",
          option_value_ids: cell.optionValueIds,
        });
      });
    }

    if (flatVariants.length > 0 || isEditing) {
      body.variants = flatVariants;
    }

    // Attach option types for "other" products
    if (category === "other" && optionTypes.length > 0) {
      body.option_types = optionTypes
        .filter((ot) => ot.name.trim() && ot.values.length > 0)
        .map((ot, idx) => ({
          id: ot.id || undefined,
          name: ot.name.trim(),
          sort_order: idx,
          values: ot.values.map((v, vi) => ({
            id: v.id || undefined,
            value: v.value,
            sort_order: vi,
          })),
        }));
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
    { key: "retail", label: "Retail", show: RETAIL_ENABLED && isRetail },
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
                <DndContext sensors={grindSensors} collisionDetection={closestCenter} onDragEnd={handleGrindDragEnd}>
                  <SortableContext items={grindTypes.map((gt) => gt.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1.5">
                      {grindTypes.map((gt) => (
                        <SortableGrindItem
                          key={gt.id}
                          gt={gt}
                          checked={selectedGtIds.has(gt.id)}
                          onToggle={() => handleToggleGrindType(channel, gt.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
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

      {/* ─── Category Selector ─── */}
      {!isEditing ? (
        <div className="max-w-2xl mb-4">
          <label className={labelClassName}>Product Category</label>
          <div className="grid grid-cols-2 gap-3 mt-1">
            <button
              type="button"
              onClick={() => setCategory("coffee")}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-colors ${
                category === "coffee"
                  ? "border-brand-600 bg-brand-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <CoffeeIcon className={`w-6 h-6 ${category === "coffee" ? "text-brand-600" : "text-slate-400"}`} />
              <div>
                <p className={`text-sm font-semibold ${category === "coffee" ? "text-brand-700" : "text-slate-900"}`}>
                  Coffee
                </p>
                <p className="text-xs text-slate-500">Weight &amp; grind variants</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setCategory("other")}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-colors ${
                category === "other"
                  ? "border-brand-600 bg-brand-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <Package className={`w-6 h-6 ${category === "other" ? "text-brand-600" : "text-slate-400"}`} />
              <div>
                <p className={`text-sm font-semibold ${category === "other" ? "text-brand-700" : "text-slate-900"}`}>
                  Other
                </p>
                <p className="text-xs text-slate-500">Custom option types</p>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mb-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            category === "coffee"
              ? "bg-amber-50 text-amber-700 border border-amber-200"
              : "bg-blue-50 text-blue-700 border border-blue-200"
          }`}>
            {category === "coffee" ? (
              <><CoffeeIcon className="w-3.5 h-3.5" /> Coffee product</>
            ) : (
              <><Package className="w-3.5 h-3.5" /> Other product</>
            )}
          </span>
        </div>
      )}

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

                  {/* Origin — coffee only */}
                  {category === "coffee" && (
                    <div>
                      <label className={labelClassName}>
                        Origin{" "}
                        <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value.slice(0, 50))}
                        placeholder="e.g. Ethiopia Yirgacheffe"
                        maxLength={50}
                        className={inputClassName}
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        {`${origin.length}/50`}
                      </p>
                    </div>
                  )}

                  {/* Tasting Notes — coffee only */}
                  {category === "coffee" && (
                    <div>
                      <label className={labelClassName}>
                        Tasting Notes{" "}
                        <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={tastingNotes}
                        onChange={(e) => setTastingNotes(e.target.value.slice(0, 100))}
                        placeholder="e.g. Milk chocolate, hazelnut & honey sweetness"
                        maxLength={100}
                        className={inputClassName}
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        {`${tastingNotes.length}/100`}
                      </p>
                    </div>
                  )}

                  {/* Full Description */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className={labelClassName}>
                        Full Description{" "}
                        <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <AiGenerateButton
                        type="product_description"
                        context={{ existingContent: description, productCategory: category }}
                        onSelect={setDescription}
                        enableShortcut
                      />
                    </div>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tell the story behind this coffee..."
                      rows={3}
                      className={inputClassName}
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Appears on the product page below the purchase section. Helps with SEO.
                    </p>
                  </div>

                  {/* Meta Description */}
                  {RETAIL_ENABLED && (
                  <div>
                    <div className="flex items-center justify-between">
                      <label className={labelClassName}>
                        Meta Description{" "}
                        <span className="text-slate-400 font-normal">(SEO)</span>
                      </label>
                      <AiGenerateButton
                        type="product_meta_description"
                        context={{ existingContent: metaDescription, productCategory: category }}
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
                  )}

                  {/* Channel Toggles */}
                  {RETAIL_ENABLED && (
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
                  )}

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

                  {/* Toggles */}
                  <div className="space-y-3 pt-1">
                    <Toggle
                      enabled={status === "published"}
                      onToggle={() => setStatus(status === "published" ? "draft" : "published")}
                      label={
                        status === "published"
                          ? `Published — visible to ${RETAIL_ENABLED ? "customers" : "buyers"}`
                          : `Draft — hidden from ${RETAIL_ENABLED ? "customers" : "buyers"}`
                      }
                    />
                    <Toggle
                      enabled={isPurchasable}
                      onToggle={() => setIsPurchasable(!isPurchasable)}
                      label={
                        isPurchasable
                          ? `Purchasable — ${RETAIL_ENABLED ? "customers" : "buyers"} can buy online`
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
                        disabled={retailVariantsEnabled}
                        className={`${inputClassName} max-w-[200px] ${retailVariantsEnabled ? "opacity-50 bg-slate-50" : ""}`}
                      />
                      {retailVariantsEnabled && (
                        <p className="text-xs text-slate-400 mt-1">
                          Price is set per variant when variants are enabled
                        </p>
                      )}
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
                {category === "coffee" ? (
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
                ) : (
                  <div className="space-y-5">
                    <h3 className="text-sm font-semibold text-slate-800">Product Options &amp; Variants</h3>
                    {renderOptionBuilder()}
                    {renderOtherVariantGrid(isWholesale ? "both" : "retail")}
                  </div>
                )}
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
                          {`${RETAIL_ENABLED ? "Customers" : "Buyers"} must order in multiples of this number.`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wholesale Variants */}
                {category === "coffee" ? (
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
                ) : (
                  <div className="space-y-5">
                    <h3 className="text-sm font-semibold text-slate-800">Wholesale Variants</h3>
                    {optionTypes.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        {RETAIL_ENABLED
                          ? "Add option types on the Retail tab to configure wholesale variant pricing."
                          : "Option types for non-coffee products are configured on the Retail tab (currently hidden)."}
                      </p>
                    ) : (
                      renderOtherVariantGrid("wholesale")
                    )}
                  </div>
                )}
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
