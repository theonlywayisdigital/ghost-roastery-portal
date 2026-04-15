"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  X,
  ImageIcon,
  Coffee as CoffeeIcon,
  Package,
  Archive,
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
import {
  restrictToParentElement,
} from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";

interface ProductImage {
  id: string;
  url: string;
  storage_path: string;
  sort_order: number;
  is_primary: boolean;
}

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
  roasted_stock_id: string | null;
  green_bean_id: string | null;
  is_blend?: boolean;
}

interface RoastedStockOption {
  id: string;
  name: string;
  green_bean_id: string | null;
  current_stock_kg: number;
  low_stock_threshold_kg: number | null;
  is_active: boolean;
}

interface GreenBeanOption {
  id: string;
  name: string;
  current_stock_kg: number;
  low_stock_threshold_kg: number | null;
  is_active: boolean;
}

interface BlendComponent {
  id?: string;
  roasted_stock_id: string;
  percentage: string; // stored as string for form input
}

interface OptionValue {
  id?: string;
  value: string;
  weightGrams?: number;
}

interface OptionType {
  id?: string;
  name: string;
  isWeight: boolean;
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


function SortableImageThumb({ image, onRemove }: { image: ProductImage; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt=""
          className="w-24 h-24 object-cover rounded-lg border border-slate-200"
        />
        {image.is_primary && (
          <span className="absolute bottom-1 left-1 text-[10px] bg-brand-600 text-white px-1.5 py-0.5 rounded font-medium">
            Primary
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(image.id)}
        className="absolute -top-2 -right-2 w-5 h-5 bg-slate-800 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
      >
        <X className="w-3 h-3" />
      </button>
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
  const [isRetail, setIsRetail] = useState(product?.is_retail ?? false);
  const [isWholesale, setIsWholesale] = useState(product?.is_wholesale ?? true);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [sku, setSku] = useState(product?.sku || "");
  const [unit, setUnit] = useState(product?.unit || "250g");
  const [weightKg, setWeightKg] = useState(
    product?.weight_grams ? (product.weight_grams / 1000).toString() : ""
  );
  const [vatRate, setVatRate] = useState(product?.vat_rate?.toString() || "0");
  const [roastedStockId, setRoastedStockId] = useState(product?.roasted_stock_id || "");
  const [roastedStocks, setRoastedStocks] = useState<RoastedStockOption[]>([]);
  const [greenBeans, setGreenBeans] = useState<GreenBeanOption[]>([]);
  const [isBlend, setIsBlend] = useState(product?.is_blend ?? false);
  const [blendComponents, setBlendComponents] = useState<BlendComponent[]>([]);

  // Ecommerce channel status
  const [channelStatus, setChannelStatus] = useState<{
    connections: { id: string; provider: string; shop_name: string | null; store_url: string }[];
    published: { connection_id: string; provider: string; shop_name: string | null }[];
  }>({ connections: [], published: [] });
  const [exportingTo, setExportingTo] = useState<string | null>(null);
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

  // Option types & variant cells (unified for all categories)
  const [optionTypes, setOptionTypes] = useState<OptionType[]>([]);
  const [otherVariantCells, setOtherVariantCells] = useState<OtherVariantCell[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Fetch roasted stock and green bean records for coffee products
  useEffect(() => {
    if (category === "coffee") {
      fetch("/api/tools/roasted-stock")
        .then((res) => res.json())
        .then((data) => {
          const stocks = (data.roastedStock || []).filter((s: RoastedStockOption) => s.is_active);
          setRoastedStocks(stocks);
        })
        .catch(() => {});
      fetch("/api/tools/green-beans")
        .then((res) => res.json())
        .then((data) => {
          const beans = (data.greenBeans || []).filter((b: GreenBeanOption) => b.is_active);
          setGreenBeans(beans);
        })
        .catch(() => {});
    }
  }, [category]);

  // Fetch ecommerce channel status when editing
  useEffect(() => {
    if (!isEditing) return;
    fetch(`/api/products/${product.id}/channels`)
      .then((res) => res.json())
      .then((data) => {
        if (data.connections) setChannelStatus(data);
      })
      .catch(() => {});
  }, [isEditing, product?.id]);

  // Fetch existing variants when editing — reconstruct option types + variant cells
  useEffect(() => {
    if (isEditing) {
      fetch(`/api/products/${product.id}`)
        .then((res) => res.json())
        .then((data) => {
          // Reconstruct option types + variant cells (universal for all categories)
          if (data.option_types && data.option_types.length > 0) {
            const loadedTypes: OptionType[] = data.option_types.map(
              (ot: { id: string; name: string; is_weight?: boolean; values: { id: string; value: string; weight_grams?: number | null }[] }) => ({
                id: ot.id,
                name: ot.name,
                isWeight: ot.is_weight ?? false,
                values: ot.values.map((v) => ({ id: v.id, value: v.value, weightGrams: v.weight_grams ?? undefined })),
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
          } else if (data.variants && data.variants.length > 0) {
            // Fallback for pre-migration coffee products: reconstruct option types
            // from weight_grams and grind_type_id on variants
            const variants: Variant[] = data.variants;
            const weightValues = new Map<number, string>();
            const grindValues = new Map<string, string>();
            for (const v of variants) {
              if (v.weight_grams != null && !weightValues.has(v.weight_grams)) {
                weightValues.set(v.weight_grams, v.unit || (v.weight_grams >= 1000 && v.weight_grams % 1000 === 0 ? `${v.weight_grams / 1000}kg` : `${v.weight_grams}g`));
              }
              if (v.grind_type_id && v.grind_type?.name && !grindValues.has(v.grind_type_id)) {
                grindValues.set(v.grind_type_id, v.grind_type.name);
              }
            }
            const types: OptionType[] = [];
            if (weightValues.size > 0) {
              types.push({
                name: "Weight",
                isWeight: true,
                values: Array.from(weightValues.entries()).map(([grams, label]) => ({
                  value: label,
                  weightGrams: grams,
                })),
              });
            }
            if (grindValues.size > 0) {
              types.push({
                name: "Grind",
                isWeight: false,
                values: Array.from(grindValues.values()).map((name) => ({
                  value: name,
                })),
              });
            }
            if (types.length > 0) {
              setOptionTypes(types);
              // Variant cells will be auto-generated by the otherVariantCombos effect
            }
          }

          // Load product images — if no product_images rows exist but the
          // product has an image_url (e.g. Squarespace import), seed the
          // images array so the URL isn't wiped on save.
          if (data.images && data.images.length > 0) {
            setImages(data.images);
          } else if (data.product?.image_url) {
            setImages([{
              id: "imported-image",
              url: data.product.image_url,
              storage_path: "",
              sort_order: 0,
              is_primary: true,
            }]);
          }

          // Load blend components
          if (data.blend_components) {
            setIsBlend(data.product?.is_blend ?? false);
            setBlendComponents(
              data.blend_components.map((bc: { id: string; roasted_stock_id: string; percentage: number }) => ({
                id: bc.id,
                roasted_stock_id: bc.roasted_stock_id,
                percentage: bc.percentage.toString(),
              }))
            );
          }
        })
        .catch(() => {
          // Non-critical
        });
    }
  }, [isEditing, product?.id]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    // Copy files BEFORE resetting input — FileList is a live reference
    // that gets emptied when the input value is cleared
    const files = Array.from(fileList);

    // Reset the input so the same file can be re-selected
    e.target.value = "";

    if (images.length + files.length > 10) {
      setError("Maximum 10 images per product");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      for (const rawFile of files) {
        try {
          const file = await compressImage(rawFile);
          const formData = new FormData();
          formData.append("file", file);

          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();

          if (!res.ok) {
            setError(data.error || "Failed to upload image");
            continue;
          }

          setImages((prev) => [
            ...prev,
            {
              id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              url: data.url,
              storage_path: data.path,
              sort_order: prev.length,
              is_primary: prev.length === 0,
            },
          ]);
        } catch {
          setError("Failed to upload image. Please try again.");
        }
      }
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemoveImage(imageId: string) {
    setImages((prev) => {
      const filtered = prev.filter((img) => img.id !== imageId);
      // Re-number sort orders and set first as primary
      return filtered.map((img, i) => ({
        ...img,
        sort_order: i,
        is_primary: i === 0,
      }));
    });
  }

  function handleImageDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setImages((prev) => {
      const oldIndex = prev.findIndex((img) => img.id === active.id);
      const newIndex = prev.findIndex((img) => img.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      return reordered.map((img, i) => ({
        ...img,
        sort_order: i,
        is_primary: i === 0,
      }));
    });
  }

  // DnD sensors for image reorder
  const imageSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // ─── Option Type Helpers ───
  function handleAddOptionType() {
    if (optionTypes.length >= 3) return;
    // For coffee products, default first option type to "Weight" with isWeight
    const isFirstCoffee = category === "coffee" && optionTypes.length === 0;
    setOptionTypes((prev) => [...prev, {
      name: isFirstCoffee ? "Weight" : "",
      isWeight: isFirstCoffee,
      values: [],
    }]);
  }

  function handleRemoveOptionType(idx: number) {
    setOptionTypes((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleOptionTypeName(idx: number, name: string) {
    const isWeight = /weight/i.test(name);
    setOptionTypes((prev) => prev.map((ot, i) => (i === idx ? { ...ot, name, isWeight } : ot)));
  }

  function handleAddOptionValue(typeIdx: number, rawValue: string) {
    if (!rawValue.trim()) return;
    const ot = optionTypes[typeIdx];
    let val: OptionValue;
    if (ot?.isWeight) {
      // Parse weight input: "250g", "1kg", "0.25kg", or just "250" (assume grams)
      const trimmed = rawValue.trim().toLowerCase();
      let grams: number | undefined;
      const kgMatch = trimmed.match(/^([\d.]+)\s*kg$/);
      const gMatch = trimmed.match(/^([\d.]+)\s*g$/);
      if (kgMatch) {
        grams = Math.round(parseFloat(kgMatch[1]) * 1000);
      } else if (gMatch) {
        grams = Math.round(parseFloat(gMatch[1]));
      } else {
        const num = parseFloat(trimmed);
        if (!isNaN(num)) grams = Math.round(num);
      }
      const label = grams
        ? (grams >= 1000 && grams % 1000 === 0 ? `${grams / 1000}kg` : `${grams}g`)
        : rawValue.trim();
      val = { value: label, weightGrams: grams };
    } else {
      val = { value: rawValue.trim() };
    }
    setOptionTypes((prev) =>
      prev.map((o, i) =>
        i === typeIdx ? { ...o, values: [...o.values, val] } : o
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
            Add option types (e.g. Weight, Grind, Size) to create product variants. Max 3.
          </p>
        )}
        {optionTypes.map((ot, typeIdx) => (
          <div key={typeIdx} className="border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={ot.name}
                onChange={(e) => handleOptionTypeName(typeIdx, e.target.value)}
                placeholder={category === "coffee" && typeIdx === 0 ? "e.g. Weight" : "e.g. Size, Colour, Grind"}
                className={`${inputClassName} flex-1`}
              />
              {ot.isWeight && (
                <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-xs font-medium whitespace-nowrap">
                  Weight
                </span>
              )}
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
                  {val.weightGrams != null && (
                    <span className="text-slate-400 text-xs">({val.weightGrams}g)</span>
                  )}
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
                placeholder={ot.isWeight ? "e.g. 250g, 1kg" : "Type a value & press Enter"}
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

    if (category === "coffee" && isBlend) {
      const validComponents = blendComponents.filter((c) => c.roasted_stock_id);
      if (validComponents.length < 2) {
        setError("A blend must have at least 2 components.");
        setIsLoading(false);
        return;
      }
      const total = validComponents.reduce((sum, c) => sum + (parseFloat(c.percentage) || 0), 0);
      if (Math.abs(total - 100) >= 0.01) {
        setError("Blend component percentages must add up to 100%.");
        setIsLoading(false);
        return;
      }
    }

    const body: Record<string, unknown> = {
      name,
      ...(!isEditing && { category }),
      origin: category === "coffee" ? origin || null : null,
      tasting_notes: category === "coffee" ? tastingNotes || null : null,
      description: description || null,
      meta_description: metaDescription || null,
      price: parseFloat(price) || 0,
      unit,
      image_url: images[0]?.url || null,
      status,
      is_retail: isRetail,
      is_wholesale: isWholesale,
      retail_price: isRetail && retailPrice ? parseFloat(retailPrice) : null,
      wholesale_price: isWholesale && wholesalePrice ? parseFloat(wholesalePrice) : null,
      minimum_wholesale_quantity: isWholesale ? parseInt(minWholesaleQty) || 1 : 1,
      sku: sku || null,
      weight_grams: weightKg ? Math.round(parseFloat(weightKg) * 1000) : null,
      roasted_stock_id: category === "coffee" && !isBlend && roastedStockId ? roastedStockId : null,
      green_bean_id: null,
      is_blend: category === "coffee" ? isBlend : false,
      blend_components: category === "coffee" && isBlend ? blendComponents.filter((c) => c.roasted_stock_id).map((c) => ({
        id: c.id || undefined,
        roasted_stock_id: c.roasted_stock_id,
        percentage: parseFloat(c.percentage) || 0,
      })) : undefined,
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

    // Build variants from option-based cells (unified for all categories)
    const flatVariants: Record<string, unknown>[] = [];

    if (otherVariantCells.length > 0) {
      otherVariantCells.forEach((cell, idx) => {
        // Find weight_grams from cell's option value IDs
        let weightGrams: number | null = null;
        for (const ot of optionTypes) {
          if (ot.isWeight) {
            const matchingValue = ot.values.find((v) =>
              cell.optionValueIds.includes(v.id || v.value)
            );
            if (matchingValue?.weightGrams) {
              weightGrams = matchingValue.weightGrams;
            }
          }
        }

        flatVariants.push({
          id: cell.id || undefined,
          weight_grams: weightGrams,
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

    // Only send variants when there are actual variants to submit.
    // Never send an empty array — the API interprets that as "delete all
    // existing variants". This protects products whose variants couldn't
    // be reconstructed from option types.
    if (flatVariants.length > 0) {
      body.variants = flatVariants;
    }

    // Attach option types for ALL categories
    if (optionTypes.length > 0) {
      body.option_types = optionTypes
        .filter((ot) => ot.name.trim() && ot.values.length > 0)
        .map((ot, idx) => ({
          id: ot.id || undefined,
          name: ot.name.trim(),
          sort_order: idx,
          is_weight: ot.isWeight,
          values: ot.values.map((v, vi) => ({
            id: v.id || undefined,
            value: v.value,
            sort_order: vi,
            weight_grams: v.weightGrams ?? null,
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

      const savedData = await res.json();
      const productId = isEditing ? product.id : savedData.product?.id;

      // Sync images for this product
      if (productId) {
        try {
          // Get existing images from server
          const imgRes = await fetch(`/api/products/${productId}/images`);
          const imgData = imgRes.ok ? await imgRes.json() : { images: [] };
          const existingImages: ProductImage[] = imgData.images || [];
          const existingIds = new Set(existingImages.map((i: ProductImage) => i.id));

          // Delete images removed from UI
          for (const existing of existingImages) {
            if (!images.find((i) => i.id === existing.id)) {
              await fetch(`/api/products/${productId}/images/${existing.id}`, {
                method: "DELETE",
              });
            }
          }

          // Add new images (temp IDs) — skip imported images without storage_path
          for (const img of images) {
            if (!existingIds.has(img.id) && img.storage_path) {
              await fetch(`/api/products/${productId}/images`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  url: img.url,
                  storage_path: img.storage_path,
                }),
              });
            }
          }

          // Reorder all images
          const reorderRes = await fetch(`/api/products/${productId}/images`);
          if (reorderRes.ok) {
            const reorderData = await reorderRes.json();
            const serverImages: ProductImage[] = reorderData.images || [];
            // Build final order by matching URLs to current UI order
            const orderedIds: string[] = [];
            for (const uiImg of images) {
              const match = serverImages.find((s) => s.url === uiImg.url);
              if (match) orderedIds.push(match.id);
            }
            if (orderedIds.length > 0) {
              await fetch(`/api/products/${productId}/images/reorder`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageIds: orderedIds }),
              });
            }
          }
        } catch {
          // Non-critical — images may be partially synced
        }
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

                  {/* Track Stock — coffee only (hidden for blends) */}
                  {category === "coffee" && !isBlend && (
                    <div>
                      <label className={labelClassName}>
                        Track Stock{" "}
                        <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <select
                        value={roastedStockId}
                        onChange={(e) => setRoastedStockId(e.target.value)}
                        className={inputClassName}
                      >
                        <option value="">Not linked to stock</option>
                        {roastedStocks.map((s) => {
                          const linkedBean = s.green_bean_id ? greenBeans.find((b) => b.id === s.green_bean_id) : null;
                          const label = linkedBean
                            ? `${s.name} (Roasted: ${Number(s.current_stock_kg).toFixed(1)}kg | Green: ${Number(linkedBean.current_stock_kg).toFixed(1)}kg)`
                            : `${s.name} (Roasted: ${Number(s.current_stock_kg).toFixed(1)}kg)`;
                          return (
                            <option key={s.id} value={s.id}>{label}</option>
                          );
                        })}
                      </select>
                      {roastedStockId && (() => {
                        const linkedStock = roastedStocks.find((s) => s.id === roastedStockId);
                        if (!linkedStock) return null;
                        const roastedKg = Number(linkedStock.current_stock_kg);
                        const linkedBean = linkedStock.green_bean_id ? greenBeans.find((b) => b.id === linkedStock.green_bean_id) : null;
                        const totalKg = roastedKg + (linkedBean ? Number(linkedBean.current_stock_kg) : 0);
                        const isOut = totalKg <= 0;
                        const isLow = linkedStock.low_stock_threshold_kg && totalKg <= Number(linkedStock.low_stock_threshold_kg);
                        const statusColor = isOut ? "text-red-600 bg-red-50 border-red-200" : isLow ? "text-amber-600 bg-amber-50 border-amber-200" : "text-green-600 bg-green-50 border-green-200";
                        const statusLabel = isOut ? "Out of stock" : isLow ? "Low stock" : "In stock";
                        return (
                          <div className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${statusColor}`}>
                            <Archive className="w-4 h-4" />
                            <span className="font-medium">{totalKg.toFixed(1)} kg total</span>
                            <span className="text-xs opacity-75">({statusLabel})</span>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Blend Toggle — coffee only */}
                  {category === "coffee" && (
                    <div>
                      <Toggle
                        enabled={isBlend}
                        onToggle={() => {
                          const next = !isBlend;
                          setIsBlend(next);
                          if (next) {
                            setRoastedStockId("");
                            if (blendComponents.length === 0) {
                              setBlendComponents([{ roasted_stock_id: "", percentage: "" }]);
                            }
                          } else {
                            setBlendComponents([]);
                          }
                        }}
                        label="This is a blend"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Blends deduct stock proportionally across multiple roast profiles. Green bean stock updates automatically.
                      </p>
                    </div>
                  )}

                  {/* Blend Components Builder — coffee blends only */}
                  {category === "coffee" && isBlend && (
                    <div className={sectionClassName}>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-800">Blend Components</h4>
                        <button
                          type="button"
                          onClick={() => setBlendComponents((prev) => [...prev, { roasted_stock_id: "", percentage: "" }])}
                          className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                        >
                          + Add component
                        </button>
                      </div>
                      {blendComponents.length === 0 && (
                        <p className="text-sm text-slate-500">
                          Add roasted stock components that make up this blend.
                        </p>
                      )}
                      <div className="space-y-3">
                        {blendComponents.map((comp, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <div className="flex-1">
                              <select
                                value={comp.roasted_stock_id}
                                onChange={(e) => {
                                  setBlendComponents((prev) =>
                                    prev.map((c, i) => i === idx ? { ...c, roasted_stock_id: e.target.value } : c)
                                  );
                                }}
                                className={inputClassName}
                              >
                                <option value="">Select roasted stock...</option>
                                {roastedStocks
                                  .filter((s) => s.id === comp.roasted_stock_id || !blendComponents.some((c, ci) => ci !== idx && c.roasted_stock_id === s.id))
                                  .map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name} ({Number(s.current_stock_kg).toFixed(1)} kg)
                                    </option>
                                  ))}
                              </select>
                            </div>
                            <div className="w-24">
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={comp.percentage}
                                  onChange={(e) => {
                                    setBlendComponents((prev) =>
                                      prev.map((c, i) => i === idx ? { ...c, percentage: e.target.value } : c)
                                    );
                                  }}
                                  placeholder="0"
                                  className={`${inputClassName} pr-7`}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setBlendComponents((prev) => prev.filter((_, i) => i !== idx))}
                              className="mt-2.5 p-1 text-slate-400 hover:text-red-500"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      {/* Total percentage indicator */}
                      {blendComponents.length > 0 && (() => {
                        const total = blendComponents.reduce((sum, c) => sum + (parseFloat(c.percentage) || 0), 0);
                        const isValid = Math.abs(total - 100) < 0.01;
                        return (
                          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                            isValid ? "text-green-600 bg-green-50 border-green-200" : "text-amber-600 bg-amber-50 border-amber-200"
                          }`}>
                            <span className="font-medium">Total: {total.toFixed(1)}%</span>
                            {!isValid && <span className="text-xs opacity-75">(must equal 100%)</span>}
                          </div>
                        );
                      })()}
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

                  {/* Product Images */}
                  <div>
                    <label className={labelClassName}>
                      Product Images{" "}
                      <span className="text-slate-400 font-normal">(up to 10, drag to reorder)</span>
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileSelect}
                      multiple
                      className="sr-only"
                    />
                    <div className="flex flex-wrap gap-3 items-start">
                      {images.length > 0 && (
                        <DndContext
                          sensors={imageSensors}
                          collisionDetection={closestCenter}
                          modifiers={[restrictToParentElement]}
                          onDragEnd={handleImageDragEnd}
                        >
                          <SortableContext
                            items={images.map((img) => img.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="flex flex-wrap gap-3">
                              {images.map((img) => (
                                <SortableImageThumb
                                  key={img.id}
                                  image={img}
                                  onRemove={handleRemoveImage}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      )}
                      {images.length < 10 && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors disabled:opacity-50"
                        >
                          {isUploading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <ImageIcon className="w-5 h-5" />
                              <span className="text-[10px] font-medium">Add</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    {images.length > 0 && (
                      <p className="text-xs text-slate-400 mt-1.5">
                        {`${images.length}/10 images — first image is the primary`}
                      </p>
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

                  {/* Ecommerce channels */}
                  {isEditing && channelStatus.connections.length > 0 && (
                    <div className="pt-3 border-t border-slate-200">
                      <label className={labelClassName}>Published to</label>
                      <div className="space-y-2">
                        {channelStatus.connections.map((conn) => {
                          const isPublished = channelStatus.published.some(
                            (p) => p.connection_id === conn.id
                          );
                          return (
                            <div
                              key={conn.id}
                              className="flex items-center justify-between py-1.5"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                                    conn.provider === "shopify"
                                      ? "bg-[#96BF48] text-white"
                                      : "bg-[#7F54B3] text-white"
                                  }`}
                                >
                                  {conn.provider === "shopify" ? "S" : "W"}
                                </span>
                                <span className="text-sm text-slate-700">
                                  {conn.shop_name || conn.store_url}
                                </span>
                              </div>
                              {isPublished ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                                  <svg
                                    className="w-3.5 h-3.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                  Synced
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    setExportingTo(conn.id);
                                    try {
                                      const res = await fetch(
                                        "/api/integrations/ecommerce/export-products",
                                        {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                            connectionId: conn.id,
                                            productIds: [product!.id],
                                          }),
                                        }
                                      );
                                      if (res.ok) {
                                        setChannelStatus((prev) => ({
                                          ...prev,
                                          published: [
                                            ...prev.published,
                                            {
                                              connection_id: conn.id,
                                              provider: conn.provider,
                                              shop_name: conn.shop_name,
                                            },
                                          ],
                                        }));
                                      }
                                    } catch {
                                      // Silent fail
                                    } finally {
                                      setExportingTo(null);
                                    }
                                  }}
                                  disabled={exportingTo === conn.id}
                                  className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
                                >
                                  {exportingTo === conn.id
                                    ? "Pushing..."
                                    : "Push to store"}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
                        disabled={otherVariantCells.length > 0}
                        className={`${inputClassName} max-w-[200px] ${otherVariantCells.length > 0 ? "opacity-50 bg-slate-50" : ""}`}
                      />
                      {otherVariantCells.length > 0 && (
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

                {/* Product Options & Variants */}
                <div className="space-y-5">
                  <h3 className="text-sm font-semibold text-slate-800">Product Options &amp; Variants</h3>
                  {renderOptionBuilder()}
                  {renderOtherVariantGrid(isWholesale ? "both" : "retail")}
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
                          {`${RETAIL_ENABLED ? "Customers" : "Buyers"} must order in multiples of this number.`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wholesale Variants */}
                <div className="space-y-5">
                  <h3 className="text-sm font-semibold text-slate-800">Wholesale Variants</h3>
                  {optionTypes.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Add option types on the Retail tab to configure wholesale variant pricing.
                    </p>
                  ) : (
                    renderOtherVariantGrid("wholesale")
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
