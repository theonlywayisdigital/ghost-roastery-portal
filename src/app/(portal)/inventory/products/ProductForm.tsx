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
  Sparkles,
  Search,
  Plus,
  Trash2,
  Users,
  Shield,
} from "@/components/icons";
import Link from "next/link";
import { RETAIL_ENABLED } from "@/lib/feature-flags";
import { AiGenerateButton } from "@/components/AiGenerateButton";
import {
  computeRoastedCostPerKg,
  computeBlendedCostPerKg,
  computeVariantCost,
  computeMarginSuggestion,
  formatCurrency,
  type MarginSettings,
  type BlendComponentInput,
} from "@/lib/margin-calculator";
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
  margin_multiplier_override?: number | null;
}

interface RoastedStockOption {
  id: string;
  name: string;
  green_bean_id: string | null;
  current_stock_kg: number;
  low_stock_threshold_kg: number | null;
  is_active: boolean;
  weight_loss_percentage?: number | null;
  green_beans?: { cost_per_kg: number | null } | null;
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
  rrp: string;
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
  rrp: number | null;
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

  // Buyer access & pricing
  const [restrictAccess, setRestrictAccess] = useState(false);
  const [selectedBuyerIds, setSelectedBuyerIds] = useState<string[]>([]);
  const [buyerPricing, setBuyerPricing] = useState<
    { wholesale_access_id: string; variant_id: string; custom_price: string }[]
  >([]);
  const [wholesaleBuyers, setWholesaleBuyers] = useState<
    { id: string; business_name: string; user_name: string; user_email: string }[]
  >([]);
  const [buyerSearchQuery, setBuyerSearchQuery] = useState("");
  const [showBuyerDropdown, setShowBuyerDropdown] = useState(false);

  // Legacy price (kept in state but hidden from form)
  const [price] = useState(product?.price?.toString() || "");

  // Margin calculator
  const [marginSettings, setMarginSettings] = useState<MarginSettings | null>(null);
  const [marginCurrency, setMarginCurrency] = useState("GBP");
  const [multiplierOverride, setMultiplierOverride] = useState(
    product?.margin_multiplier_override?.toString() || ""
  );

  // Per-channel option types & variant cells
  const [retailOptionTypes, setRetailOptionTypes] = useState<OptionType[]>([]);
  const [retailVariantCells, setRetailVariantCells] = useState<OtherVariantCell[]>([]);
  const [wholesaleOptionTypes, setWholesaleOptionTypes] = useState<OptionType[]>([]);
  const [wholesaleVariantCells, setWholesaleVariantCells] = useState<OtherVariantCell[]>([]);

  // Storefront integration detection
  const [hasStorefrontIntegration, setHasStorefrontIntegration] = useState<boolean | null>(null);

  function generateSkuCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return `RP-${code}`;
  }

  function generateSku() {
    setSku(generateSkuCode());
  }

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch active storefront integrations
  useEffect(() => {
    fetch("/api/integrations/ecommerce/status")
      .then((res) => res.json())
      .then((data) => {
        setHasStorefrontIntegration(data.hasActiveConnection === true);
      })
      .catch(() => setHasStorefrontIntegration(false));
  }, []);

  // Fetch approved wholesale buyers for the Customer Access section
  useEffect(() => {
    if (!isWholesale) return;
    fetch("/api/wholesale-buyers")
      .then((res) => res.json())
      .then((data) => {
        const approved = (data.buyers || [])
          .filter((b: { status: string }) => b.status === "approved")
          .map((b: { id: string; business_name: string; users: { full_name: string; email: string } | null }) => ({
            id: b.id,
            business_name: b.business_name || "",
            user_name: b.users?.full_name || "",
            user_email: b.users?.email || "",
          }));
        setWholesaleBuyers(approved);
      })
      .catch(() => {});
  }, [isWholesale]);

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

  // Fetch margin settings for suggested prices
  useEffect(() => {
    if (category === "coffee") {
      fetch("/api/settings/margin")
        .then((res) => res.json())
        .then((data) => {
          setMarginSettings({
            markup_multiplier: data.margin_markup_multiplier ?? 3.5,
            wholesale_discount_pct: data.margin_wholesale_discount_pct ?? 35,
            retail_rounding: data.margin_retail_rounding ?? 0.05,
            wholesale_rounding: data.margin_wholesale_rounding ?? 0.05,
            default_weight_loss_pct: data.default_weight_loss_pct ?? 14,
          });
          setMarginCurrency(data.invoice_currency || "GBP");
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

  // Fetch existing variants when editing — split option types + variant cells by channel
  useEffect(() => {
    if (isEditing) {
      fetch(`/api/products/${product.id}`)
        .then((res) => res.json())
        .then((data) => {
          // Split option types by channel
          if (data.option_types && data.option_types.length > 0) {
            const toOptionType = (ot: { id: string; name: string; is_weight?: boolean; channel?: string; values: { id: string; value: string; weight_grams?: number | null }[] }): OptionType => ({
              id: ot.id,
              name: ot.name,
              isWeight: ot.is_weight ?? false,
              values: ot.values.map((v) => ({ id: v.id, value: v.value, weightGrams: v.weight_grams ?? undefined })),
            });

            const retailTypes = data.option_types
              .filter((ot: { channel?: string }) => (ot.channel || "retail") === "retail")
              .map(toOptionType);
            const wholesaleTypes = data.option_types
              .filter((ot: { channel?: string }) => ot.channel === "wholesale")
              .map(toOptionType);

            if (retailTypes.length > 0) setRetailOptionTypes(retailTypes);
            if (wholesaleTypes.length > 0) setWholesaleOptionTypes(wholesaleTypes);

            // Split variant cells by channel
            if (data.variants && data.variants.length > 0) {
              const toCell = (v: Variant & { option_value_ids?: string[] }): OtherVariantCell => ({
                id: v.id,
                label: v.unit || "",
                optionValueIds: v.option_value_ids || [],
                retailPrice: v.retail_price?.toString() || "",
                wholesalePrice: v.wholesale_price?.toString() || "",
                rrp: v.rrp?.toString() || "",
                sku: v.sku || "",
                trackStock: v.track_stock,
                stockCount: v.retail_stock_count?.toString() || "",
                isActive: v.is_active,
              });

              const retailVars = data.variants
                .filter((v: Variant) => (v.channel || "retail") === "retail")
                .map(toCell);
              const wholesaleVars = data.variants
                .filter((v: Variant) => v.channel === "wholesale")
                .map(toCell);

              if (retailVars.length > 0) setRetailVariantCells(retailVars);
              if (wholesaleVars.length > 0) setWholesaleVariantCells(wholesaleVars);
            }
          } else if (data.variants && data.variants.length > 0) {
            // Fallback for pre-migration coffee products: reconstruct option types
            // from weight_grams and grind_type_id on variants — all go to retail
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
              setRetailOptionTypes(types);
              // Variant cells will be auto-generated by the retailVariantCombos effect
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

          // Load buyer access restrictions
          if (data.buyer_access && data.buyer_access.length > 0) {
            setRestrictAccess(true);
            setSelectedBuyerIds(
              data.buyer_access.map((ba: { wholesale_access_id: string }) => ba.wholesale_access_id)
            );
          }

          // Load buyer pricing overrides
          if (data.buyer_pricing && data.buyer_pricing.length > 0) {
            setBuyerPricing(
              data.buyer_pricing.map((bp: { wholesale_access_id: string; variant_id: string; custom_price: number }) => ({
                wholesale_access_id: bp.wholesale_access_id,
                variant_id: bp.variant_id,
                custom_price: bp.custom_price.toString(),
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

  // Auto-seed Weight option type on coffee products (new products only)
  // and remove it when switching away from coffee
  const hasSeededWeight = useRef(false);
  useEffect(() => {
    if (isEditing) return;
    if (category === "coffee") {
      if (hasSeededWeight.current) return;
      hasSeededWeight.current = true;
      const weightType: OptionType = { name: "Weight", isWeight: true, values: [] };
      setRetailOptionTypes((prev) => prev.some((ot) => ot.isWeight) ? prev : [weightType, ...prev]);
      setWholesaleOptionTypes((prev) => prev.some((ot) => ot.isWeight) ? prev : [weightType, ...prev]);
    } else {
      // Non-coffee: remove any auto-seeded Weight option types that have no values
      hasSeededWeight.current = false;
      setRetailOptionTypes((prev) => prev.filter((ot) => !(ot.isWeight && ot.values.length === 0)));
      setWholesaleOptionTypes((prev) => prev.filter((ot) => !(ot.isWeight && ot.values.length === 0)));
    }
  }, [category, isEditing]);

  // Derived: does this product have a roast profile linked?
  const hasRoastProfile = category === "coffee" && (
    (!isBlend && !!roastedStockId) ||
    (isBlend && blendComponents.some((c) => c.roasted_stock_id))
  );

  // ─── Channel-aware Option Type Helpers ───
  function getOptionState(channel: "retail" | "wholesale") {
    return channel === "retail"
      ? { optionTypes: retailOptionTypes, setOptionTypes: setRetailOptionTypes }
      : { optionTypes: wholesaleOptionTypes, setOptionTypes: setWholesaleOptionTypes };
  }

  function handleAddOptionType(channel: "retail" | "wholesale") {
    const { optionTypes, setOptionTypes } = getOptionState(channel);
    if (optionTypes.length >= 3) return;
    const isFirstCoffee = category === "coffee" && optionTypes.length === 0;
    setOptionTypes((prev) => [...prev, {
      name: isFirstCoffee ? "Weight" : "",
      isWeight: isFirstCoffee,
      values: [],
    }]);
  }

  function handleRemoveOptionType(channel: "retail" | "wholesale", idx: number) {
    const { optionTypes, setOptionTypes } = getOptionState(channel);
    // Prevent removing Weight option type on coffee products
    if (category === "coffee" && optionTypes[idx]?.isWeight) return;
    setOptionTypes((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleOptionTypeName(channel: "retail" | "wholesale", idx: number, name: string) {
    const { setOptionTypes } = getOptionState(channel);
    const isWeight = /weight/i.test(name);
    setOptionTypes((prev) => prev.map((ot, i) => (i === idx ? { ...ot, name, isWeight } : ot)));
  }

  function handleAddOptionValue(channel: "retail" | "wholesale", typeIdx: number, rawValue: string) {
    if (!rawValue.trim()) return;
    const { optionTypes, setOptionTypes } = getOptionState(channel);
    const ot = optionTypes[typeIdx];
    let val: OptionValue;
    if (ot?.isWeight) {
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

  function handleRemoveOptionValue(channel: "retail" | "wholesale", typeIdx: number, valIdx: number) {
    const { setOptionTypes } = getOptionState(channel);
    setOptionTypes((prev) =>
      prev.map((ot, i) =>
        i === typeIdx ? { ...ot, values: ot.values.filter((_, vi) => vi !== valIdx) } : ot
      )
    );
  }

  // Compute cartesian product combos per channel
  function computeCombos(types: OptionType[]) {
    const validTypes = types.filter((ot) => ot.name.trim() && ot.values.length > 0);
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
  }

  const retailVariantCombos = useMemo(() => computeCombos(retailOptionTypes), [retailOptionTypes]);
  const wholesaleVariantCombos = useMemo(() => computeCombos(wholesaleOptionTypes), [wholesaleOptionTypes]);

  // Sync retail variant cells
  useEffect(() => {
    setRetailVariantCells((prev) => {
      if (retailVariantCombos.length === 0) return prev.length === 0 ? prev : [];
      const existingByLabel = new Map(prev.map((c) => [c.label, c]));
      return retailVariantCombos.map((combo) => {
        const existing = existingByLabel.get(combo.label);
        return existing
          ? { ...existing, optionValueIds: combo.optionValueIds }
          : { label: combo.label, optionValueIds: combo.optionValueIds, retailPrice: "", wholesalePrice: "", rrp: "", sku: "", trackStock: false, stockCount: "", isActive: false };
      });
    });
  }, [retailVariantCombos]);

  // Sync wholesale variant cells
  useEffect(() => {
    setWholesaleVariantCells((prev) => {
      if (wholesaleVariantCombos.length === 0) return prev.length === 0 ? prev : [];
      const existingByLabel = new Map(prev.map((c) => [c.label, c]));
      return wholesaleVariantCombos.map((combo) => {
        const existing = existingByLabel.get(combo.label);
        return existing
          ? { ...existing, optionValueIds: combo.optionValueIds }
          : { label: combo.label, optionValueIds: combo.optionValueIds, retailPrice: "", wholesalePrice: "", rrp: "", sku: "", trackStock: false, stockCount: "", isActive: false };
      });
    });
  }, [wholesaleVariantCombos]);

  function updateVariantCell(channel: "retail" | "wholesale", idx: number, updates: Partial<OtherVariantCell>) {
    const setter = channel === "retail" ? setRetailVariantCells : setWholesaleVariantCells;
    setter((prev) => prev.map((c, i) => (i === idx ? { ...c, ...updates } : c)));
  }

  // ─── Margin Suggestion Helpers ───

  // Compute roasted cost per kg for current product (single origin or blend)
  const roastedCostPerKg = useMemo(() => {
    if (!marginSettings || category !== "coffee") return null;

    if (isBlend) {
      const components: BlendComponentInput[] = blendComponents
        .filter((c) => c.roasted_stock_id)
        .map((c) => {
          const stock = roastedStocks.find((s) => s.id === c.roasted_stock_id);
          return {
            green_cost_per_kg: stock?.green_beans?.cost_per_kg ?? null,
            weight_loss_pct: stock?.weight_loss_percentage ?? null,
            percentage: parseFloat(c.percentage) || 0,
          };
        });
      return computeBlendedCostPerKg(components, marginSettings.default_weight_loss_pct);
    }

    if (!roastedStockId) return null;
    const stock = roastedStocks.find((s) => s.id === roastedStockId);
    if (!stock?.green_beans?.cost_per_kg) return null;
    const loss = stock.weight_loss_percentage ?? marginSettings.default_weight_loss_pct;
    return computeRoastedCostPerKg(stock.green_beans.cost_per_kg, loss);
  }, [marginSettings, category, isBlend, blendComponents, roastedStockId, roastedStocks]);

  // Get weight in grams for a variant cell by parsing the label or finding the weight option value
  function getVariantWeightGrams(cell: OtherVariantCell, channel: "retail" | "wholesale"): number | null {
    const types = channel === "retail" ? retailOptionTypes : wholesaleOptionTypes;
    const weightType = types.find((ot) => ot.isWeight);
    if (!weightType) return null;

    // Find which weight value this cell uses by checking optionValueIds
    for (const val of weightType.values) {
      const valId = val.id || val.value;
      if (cell.optionValueIds.includes(valId)) {
        return val.weightGrams ?? null;
      }
    }
    return null;
  }

  // Compute suggestion for a specific variant cell
  function getVariantSuggestion(cell: OtherVariantCell, channel: "retail" | "wholesale") {
    if (!marginSettings || !roastedCostPerKg) return null;
    const weightGrams = getVariantWeightGrams(cell, channel);
    if (!weightGrams) return null;

    const variantCost = computeVariantCost({ weight_grams: weightGrams, roasted_cost_per_kg: roastedCostPerKg });
    const override = multiplierOverride ? parseFloat(multiplierOverride) : null;
    return computeMarginSuggestion(variantCost, marginSettings, override);
  }

  // ─── Option Builder Renderer (per-channel) ───
  function renderOptionBuilder(channel: "retail" | "wholesale") {
    const { optionTypes } = getOptionState(channel);
    return (
      <div className={sectionClassName}>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-800">Option Types</h4>
          {optionTypes.length < 3 && (
            <button
              type="button"
              onClick={() => handleAddOptionType(channel)}
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
        {optionTypes.map((ot, typeIdx) => {
          const isLockedWeight = category === "coffee" && ot.isWeight;
          return (
          <div key={typeIdx} className="border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={ot.name}
                onChange={(e) => handleOptionTypeName(channel, typeIdx, e.target.value)}
                placeholder={category === "coffee" && typeIdx === 0 ? "e.g. Weight" : "e.g. Size, Colour, Grind"}
                readOnly={isLockedWeight}
                className={`${inputClassName} flex-1 ${isLockedWeight ? "bg-slate-50 text-slate-500" : ""}`}
              />
              {ot.isWeight && (
                <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-xs font-medium whitespace-nowrap">
                  Weight
                </span>
              )}
              {!isLockedWeight && (
                <button
                  type="button"
                  onClick={() => handleRemoveOptionType(channel, typeIdx)}
                  className="p-1.5 text-slate-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {ot.values.map((val, valIdx) => (
                <span
                  key={valIdx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-sm"
                >
                  {val.value}
                  {val.weightGrams != null && (
                    <span className="text-slate-400 text-xs">({parseFloat((val.weightGrams / 1000).toPrecision(4))}kg)</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveOptionValue(channel, typeIdx, valIdx)}
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
                    handleAddOptionValue(channel, typeIdx, input.value);
                    input.value = "";
                  }
                }}
              />
            </div>
            {ot.isWeight && (
              <p className="text-xs text-slate-400">
                Enter weight as displayed to buyers e.g. 250g, 1kg. Stock will be tracked in kg.
              </p>
            )}
          </div>
          );
        })}
      </div>
    );
  }

  // ─── Variant Grid Renderer (per-channel) ───
  function renderVariantGrid(channel: "retail" | "wholesale") {
    const cells = channel === "retail" ? retailVariantCells : wholesaleVariantCells;
    if (cells.length === 0) return null;

    const priceLabel = channel === "retail" ? "Retail £" : "Wholesale £";
    const priceField = channel === "retail" ? "retailPrice" : "wholesalePrice";
    const showManualStock = !hasRoastProfile;
    const showRrp = category === "coffee";

    return (
      <div className={sectionClassName}>
        <h4 className="text-sm font-semibold text-slate-800">
          {`Variant Combinations (${cells.length})`}
        </h4>
        {showManualStock && category === "coffee" && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            No roast profile linked — you can set manual stock counts per variant below. To track stock automatically, link a roast profile in the Track Stock field on the Overview tab.
          </p>
        )}
        {showManualStock && (
          <p className="text-xs text-slate-400">
            Manual stock tracking — use this to track individual unit counts per variant. Only needed if you are not using roast profile stock tracking above.
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 pr-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Variant</th>
                <th className="text-left py-2 px-3 font-medium text-slate-500 text-xs uppercase tracking-wide">{priceLabel}</th>
                {showRrp && (
                  <th className="text-left py-2 px-3 font-medium text-slate-500 text-xs uppercase tracking-wide">RRP £</th>
                )}
                <th className="text-left py-2 px-3 font-medium text-slate-500 text-xs uppercase tracking-wide">SKU</th>
                {showManualStock && (
                  <th className="text-left py-2 px-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Manual Stock</th>
                )}
                <th className="text-center py-2 px-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Active</th>
              </tr>
            </thead>
            <tbody>
              {cells.map((cell, idx) => (
                <tr key={cell.label} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5 pr-3 font-medium text-slate-900 whitespace-nowrap">{cell.label}</td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cell[priceField as keyof OtherVariantCell] as string}
                      onChange={(e) => updateVariantCell(channel, idx, { [priceField]: e.target.value })}
                      placeholder="0.00"
                      className="w-20 px-2 py-1 border border-slate-300 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    {(() => {
                      const suggestion = getVariantSuggestion(cell, channel);
                      if (!suggestion) return null;
                      const suggestedPrice = channel === "retail" ? suggestion.suggested_retail : suggestion.suggested_wholesale;
                      const currentPrice = parseFloat(cell[priceField as keyof OtherVariantCell] as string);
                      const isMatch = !isNaN(currentPrice) && Math.abs(currentPrice - suggestedPrice) < 0.01;
                      if (isMatch) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => updateVariantCell(channel, idx, { [priceField]: suggestedPrice.toFixed(2) })}
                          className="block text-xs text-brand-600 hover:text-brand-700 mt-0.5 whitespace-nowrap"
                          title={`Cost: ${formatCurrency(suggestion.variant_cost, marginCurrency)}`}
                        >
                          {formatCurrency(suggestedPrice, marginCurrency)} <span className="underline">use</span>
                        </button>
                      );
                    })()}
                  </td>
                  {showRrp && (
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={cell.rrp}
                        onChange={(e) => updateVariantCell(channel, idx, { rrp: e.target.value })}
                        placeholder="0.00"
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </td>
                  )}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={cell.sku}
                        onChange={(e) => updateVariantCell(channel, idx, { sku: e.target.value })}
                        placeholder="SKU"
                        className="w-24 px-2 py-1 border border-slate-300 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => updateVariantCell(channel, idx, { sku: generateSkuCode() })}
                        title="Generate SKU"
                        className="p-1 text-slate-400 hover:text-brand-600 transition-colors"
                      >
                        <Sparkles className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  {showManualStock && (
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateVariantCell(channel, idx, { trackStock: !cell.trackStock, stockCount: cell.trackStock ? "" : cell.stockCount })}
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
                            onChange={(e) => updateVariantCell(channel, idx, { stockCount: e.target.value })}
                            placeholder="0"
                            className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                        )}
                      </div>
                    </td>
                  )}
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => updateVariantCell(channel, idx, { isActive: !cell.isActive })}
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

  // ─── Copy Variants Between Channels ───
  function copyVariantsFrom(sourceChannel: "retail" | "wholesale") {
    const targetChannel = sourceChannel === "retail" ? "wholesale" : "retail";
    const sourceTypes = sourceChannel === "retail" ? retailOptionTypes : wholesaleOptionTypes;
    const sourceCells = sourceChannel === "retail" ? retailVariantCells : wholesaleVariantCells;
    const setTargetTypes = targetChannel === "retail" ? setRetailOptionTypes : setWholesaleOptionTypes;
    const setTargetCells = targetChannel === "retail" ? setRetailVariantCells : setWholesaleVariantCells;

    // Clone option types (strip IDs so they're created fresh for the target channel)
    setTargetTypes(sourceTypes.map((ot) => ({
      name: ot.name,
      isWeight: ot.isWeight,
      values: ot.values.map((v) => ({ value: v.value, weightGrams: v.weightGrams })),
    })));

    // Clone cells with cleared prices (prices are independent per channel)
    setTargetCells(sourceCells.map((cell) => ({
      label: cell.label,
      optionValueIds: cell.optionValueIds,
      retailPrice: "",
      wholesalePrice: "",
      rrp: "",
      sku: cell.sku,
      trackStock: cell.trackStock,
      stockCount: cell.stockCount,
      isActive: cell.isActive,
    })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (isRetail && !sku.trim()) {
      setError("SKU is required when Retail is selected.");
      setIsLoading(false);
      return;
    }

    // Coffee products must have at least one weight variant per enabled channel
    if (category === "coffee") {
      const retailWeightValues = retailOptionTypes.find((ot) => ot.isWeight)?.values ?? [];
      const wholesaleWeightValues = wholesaleOptionTypes.find((ot) => ot.isWeight)?.values ?? [];
      if (isRetail && retailWeightValues.length === 0) {
        setError("Coffee products need at least one weight variant on the Retail tab (e.g. 250g, 1kg).");
        setIsLoading(false);
        return;
      }
      if (isWholesale && wholesaleWeightValues.length === 0) {
        setError("Coffee products need at least one weight variant on the Wholesale tab (e.g. 250g, 1kg).");
        setIsLoading(false);
        return;
      }
    }

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
      minimum_wholesale_quantity: isWholesale ? parseFloat(minWholesaleQty) || 1 : 1,
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
      margin_multiplier_override: multiplierOverride ? parseFloat(multiplierOverride) : null,
    };

    // Build variants from both channels
    const flatVariants: Record<string, unknown>[] = [];

    function buildVariantsFromChannel(
      channel: "retail" | "wholesale",
      cells: OtherVariantCell[],
      types: OptionType[],
      startIdx: number,
    ) {
      cells.forEach((cell, idx) => {
        let weightGrams: number | null = null;
        for (const ot of types) {
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
          retail_price: channel === "retail" && cell.retailPrice ? parseFloat(cell.retailPrice) : null,
          wholesale_price: channel === "wholesale" && cell.wholesalePrice ? parseFloat(cell.wholesalePrice) : null,
          rrp: cell.rrp ? parseFloat(cell.rrp) : null,
          retail_stock_count: cell.trackStock ? parseInt(cell.stockCount) || 0 : null,
          track_stock: cell.trackStock,
          is_active: cell.isActive,
          sort_order: startIdx + idx,
          channel,
          option_value_ids: cell.optionValueIds,
        });
      });
    }

    if (isRetail && retailVariantCells.length > 0) {
      buildVariantsFromChannel("retail", retailVariantCells, retailOptionTypes, 0);
    }
    if (isWholesale && wholesaleVariantCells.length > 0) {
      buildVariantsFromChannel("wholesale", wholesaleVariantCells, wholesaleOptionTypes, retailVariantCells.length);
    }

    // Only send variants when there are actual variants to submit.
    // Never send an empty array — the API interprets that as "delete all
    // existing variants". This protects products whose variants couldn't
    // be reconstructed from option types.
    if (flatVariants.length > 0) {
      body.variants = flatVariants;
    }

    // Attach option types from both channels
    const allOptionTypes: Record<string, unknown>[] = [];
    function collectOptionTypes(types: OptionType[], channel: "retail" | "wholesale") {
      types
        .filter((ot) => ot.name.trim() && ot.values.length > 0)
        .forEach((ot, idx) => {
          allOptionTypes.push({
            id: ot.id || undefined,
            name: ot.name.trim(),
            sort_order: idx,
            is_weight: ot.isWeight,
            channel,
            values: ot.values.map((v, vi) => ({
              id: v.id || undefined,
              value: v.value,
              sort_order: vi,
              weight_grams: v.weightGrams ?? null,
            })),
          });
        });
    }
    if (isRetail) collectOptionTypes(retailOptionTypes, "retail");
    if (isWholesale) collectOptionTypes(wholesaleOptionTypes, "wholesale");
    if (allOptionTypes.length > 0) {
      body.option_types = allOptionTypes;
    }

    // Buyer access restrictions
    if (isWholesale) {
      body.buyer_access = restrictAccess
        ? selectedBuyerIds.map((id) => ({ wholesale_access_id: id }))
        : [];
      // Buyer pricing overrides
      body.buyer_pricing = buyerPricing
        .filter((bp) => bp.wholesale_access_id && bp.variant_id && bp.custom_price)
        .map((bp) => ({
          wholesale_access_id: bp.wholesale_access_id,
          variant_id: bp.variant_id,
          custom_price: parseFloat(bp.custom_price),
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

      router.push("/inventory/products");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }

  // Tabs to show
  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: "overview", label: "Overview", show: true },
    { key: "wholesale", label: "Wholesale", show: isWholesale },
    { key: "retail", label: "Retail", show: isRetail },
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
          href="/inventory/products"
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

      {/* ─── Channel Selection ─── */}
      <div className="max-w-2xl mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">Where will this product be sold?</label>
        <div className="flex gap-3">
          {/* Wholesale checkbox */}
          <label
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors self-start ${
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
          {/* Retail checkbox */}
          {/* TODO: Restore integration gate before launch */}
          <label
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors self-start ${
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
        </div>
        {!isRetail && !isWholesale && (
          <p className="text-xs text-amber-600 mt-1.5">
            At least one channel should be selected.
          </p>
        )}
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
                      placeholder={category === "coffee" ? "e.g. Ethiopian Yirgacheffe" : "e.g. Roastery Tote Bag"}
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

                  {/* Per-Product Multiplier Override — coffee only */}
                  {category === "coffee" && marginSettings && (
                    <div>
                      <label className={labelClassName}>
                        Markup Multiplier Override{" "}
                        <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="20"
                        value={multiplierOverride}
                        onChange={(e) => setMultiplierOverride(e.target.value)}
                        placeholder={`Default: ${marginSettings.markup_multiplier}x`}
                        className={inputClassName}
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Leave blank to use the global default ({marginSettings.markup_multiplier}x).
                        Set a custom multiplier for this product only.{" "}
                        <Link href="/settings/margin" className="text-brand-600 hover:text-brand-700">
                          Edit defaults
                        </Link>
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
                      placeholder={category === "coffee" ? "Tell the story behind this coffee..." : "Tell the story behind this product..."}
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
                        {isRetail ? (
                          <span className="text-red-500 font-normal">*</span>
                        ) : (
                          <span className="text-slate-400 font-normal">(optional)</span>
                        )}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={sku}
                          onChange={(e) => setSku(e.target.value)}
                          placeholder={category === "coffee" ? "GR-ETH-250" : "GR-TOTE-001"}
                          className={`${inputClassName} flex-1`}
                        />
                        <button
                          type="button"
                          onClick={generateSku}
                          className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition-colors whitespace-nowrap"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Generate
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Already have a SKU from another platform? Enter it here.
                      </p>
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
                <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                  Your product will sync to your connected storefronts. Stock levels update automatically based on your roast profile. To pause sales, deactivate the product from the Overview tab.
                </p>
                {/* Retail Settings — only for non-coffee (coffee sets price per variant, stock via roast profile) */}
                {category !== "coffee" && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-4">Retail Settings</h3>
                    <div className={sectionClassName}>
                      <div>
                        <label className={labelClassName}>Retail Price (£)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={retailPrice}
                          onChange={(e) => setRetailPrice(e.target.value)}
                          placeholder="8.50"
                          disabled={retailVariantCells.length > 0}
                          className={`${inputClassName} max-w-[200px] ${retailVariantCells.length > 0 ? "opacity-50 bg-slate-50" : ""}`}
                        />
                        {retailVariantCells.length > 0 && (
                          <p className="text-xs text-slate-400 mt-1">
                            Price is set per variant when variants are enabled
                          </p>
                        )}
                      </div>

                      {retailVariantCells.length > 0 ? (
                        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                          Stock is tracked per variant below.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          <Toggle
                            enabled={trackStock}
                            onToggle={() => setTrackStock(!trackStock)}
                            label="Track stock for this product"
                          />
                          <p className="text-xs text-slate-400">
                            Enable to track how many units you have. If you add variants below, stock is tracked per variant instead.
                          </p>
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
                      )}
                    </div>
                  </div>
                )}

                {/* Retail Options & Variants */}
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">Retail Options &amp; Variants</h3>
                    {isWholesale && wholesaleOptionTypes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => copyVariantsFrom("wholesale")}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                      >
                        Copy from Wholesale
                      </button>
                    )}
                  </div>
                  {renderOptionBuilder("retail")}
                  {renderVariantGrid("retail")}
                </div>

                {/* Feed & Marketplace Settings */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">Feed &amp; Marketplace Settings</h3>
                  <div className={sectionClassName}>
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
                        <p className="text-xs text-slate-400 mt-1">
                          Your brand or roastery name. Used by some storefronts and Google Shopping feeds.
                        </p>
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
                        <p className="text-xs text-slate-400 mt-1">
                          Global Trade Item Number — the barcode on your packaging. Optional but improves visibility on Google Shopping and some marketplaces.
                        </p>
                      </div>
                    </div>

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
                      <p className="text-xs text-slate-400 mt-1">
                        Used for Google Shopping feeds. The default covers most coffee products — only change this if you sell non-coffee items on this storefront.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════ WHOLESALE TAB ═══════════════ */}
            {activeTab === "wholesale" && isWholesale && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">Wholesale Pricing</h3>
                  <div className={sectionClassName}>
                    {/* Wholesale Price & RRP — hidden for coffee (set per variant instead) */}
                    {category !== "coffee" && (
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
                    )}

                    {/* Min Qty & Order Multiples */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClassName}>{category === "coffee" ? "Minimum Order (kg)" : "Minimum Order Qty"}</label>
                        <input
                          type="number"
                          min="0"
                          step={category === "coffee" ? "0.1" : "1"}
                          value={minWholesaleQty}
                          onChange={(e) => setMinWholesaleQty(e.target.value)}
                          placeholder="1"
                          className={inputClassName}
                        />
                        <p className="text-xs text-slate-400 mt-1">
                          {category === "coffee"
                            ? "Buyers must order at least this total weight in kg."
                            : "Buyers must order at least this many units."}
                        </p>
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

                {/* Wholesale Options & Variants */}
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">Wholesale Options &amp; Variants</h3>
                    {isRetail && retailOptionTypes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => copyVariantsFrom("retail")}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                      >
                        Copy from Retail
                      </button>
                    )}
                  </div>
                  {renderOptionBuilder("wholesale")}
                  {renderVariantGrid("wholesale")}
                </div>

                {/* ─── Customer Access ─── */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-slate-500" />
                    Customer Access
                  </h3>
                  <div className={sectionClassName}>
                    {/* Product Visibility Toggle */}
                    <div>
                      <Toggle
                        enabled={restrictAccess}
                        onToggle={() => {
                          setRestrictAccess(!restrictAccess);
                          if (restrictAccess) setSelectedBuyerIds([]);
                        }}
                        label="Restrict to specific buyers"
                      />
                      <p className="text-xs text-slate-400 mt-1.5 ml-14">
                        {restrictAccess
                          ? "Only selected buyers can see this product in the wholesale catalogue."
                          : "All approved wholesale buyers can see this product."}
                      </p>
                    </div>

                    {/* Buyer Selector */}
                    {restrictAccess && (
                      <div>
                        <label className={labelClassName}>Allowed Buyers</label>
                        {/* Selected buyer chips */}
                        {selectedBuyerIds.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {selectedBuyerIds.map((buyerId) => {
                              const buyer = wholesaleBuyers.find((b) => b.id === buyerId);
                              return (
                                <span
                                  key={buyerId}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 text-brand-700 rounded-full text-xs font-medium"
                                >
                                  <Users className="w-3 h-3" />
                                  {buyer?.business_name || buyer?.user_name || buyerId.slice(0, 8)}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedBuyerIds(selectedBuyerIds.filter((id) => id !== buyerId))
                                    }
                                    className="ml-0.5 hover:text-brand-900"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                        {/* Searchable dropdown */}
                        <div className="relative">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="text"
                              value={buyerSearchQuery}
                              onChange={(e) => {
                                setBuyerSearchQuery(e.target.value);
                                setShowBuyerDropdown(true);
                              }}
                              onFocus={() => setShowBuyerDropdown(true)}
                              placeholder="Search buyers by name or business..."
                              className={`${inputClassName} pl-9`}
                            />
                          </div>
                          {showBuyerDropdown && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {wholesaleBuyers
                                .filter((b) => !selectedBuyerIds.includes(b.id))
                                .filter((b) => {
                                  if (!buyerSearchQuery) return true;
                                  const q = buyerSearchQuery.toLowerCase();
                                  return (
                                    b.business_name.toLowerCase().includes(q) ||
                                    b.user_name.toLowerCase().includes(q) ||
                                    b.user_email.toLowerCase().includes(q)
                                  );
                                })
                                .map((buyer) => (
                                  <button
                                    key={buyer.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedBuyerIds([...selectedBuyerIds, buyer.id]);
                                      setBuyerSearchQuery("");
                                      setShowBuyerDropdown(false);
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                                  >
                                    <div>
                                      <p className="text-sm font-medium text-slate-800">
                                        {buyer.business_name || buyer.user_name}
                                      </p>
                                      <p className="text-xs text-slate-500">{buyer.user_email}</p>
                                    </div>
                                    <Plus className="w-4 h-4 text-slate-400" />
                                  </button>
                                ))}
                              {wholesaleBuyers.filter(
                                (b) =>
                                  !selectedBuyerIds.includes(b.id) &&
                                  (!buyerSearchQuery ||
                                    b.business_name.toLowerCase().includes(buyerSearchQuery.toLowerCase()) ||
                                    b.user_name.toLowerCase().includes(buyerSearchQuery.toLowerCase()) ||
                                    b.user_email.toLowerCase().includes(buyerSearchQuery.toLowerCase()))
                              ).length === 0 && (
                                <p className="px-3 py-2 text-xs text-slate-400">No buyers found</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Custom Pricing */}
                    <div className="pt-3 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <label className={labelClassName + " mb-0"}>Custom Pricing</label>
                        <button
                          type="button"
                          onClick={() =>
                            setBuyerPricing([
                              ...buyerPricing,
                              { wholesale_access_id: "", variant_id: "", custom_price: "" },
                            ])
                          }
                          className="text-xs text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Override
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 mb-3">
                        Override the default wholesale price for specific buyers and variants.
                      </p>

                      {buyerPricing.length === 0 && (
                        <p className="text-xs text-slate-400 italic">No custom pricing overrides set.</p>
                      )}

                      {buyerPricing.map((bp, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 mb-2 items-end">
                          {/* Buyer select */}
                          <div>
                            {idx === 0 && <label className="block text-xs font-medium text-slate-500 mb-1">Buyer</label>}
                            <select
                              value={bp.wholesale_access_id}
                              onChange={(e) => {
                                const updated = [...buyerPricing];
                                updated[idx] = { ...updated[idx], wholesale_access_id: e.target.value };
                                setBuyerPricing(updated);
                              }}
                              className={inputClassName + " text-sm"}
                            >
                              <option value="">Select buyer…</option>
                              {wholesaleBuyers.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.business_name || b.user_name}
                                </option>
                              ))}
                            </select>
                          </div>
                          {/* Variant select */}
                          <div>
                            {idx === 0 && <label className="block text-xs font-medium text-slate-500 mb-1">Variant</label>}
                            <select
                              value={bp.variant_id}
                              onChange={(e) => {
                                const updated = [...buyerPricing];
                                updated[idx] = { ...updated[idx], variant_id: e.target.value };
                                setBuyerPricing(updated);
                              }}
                              className={inputClassName + " text-sm"}
                            >
                              <option value="">Select variant…</option>
                              {wholesaleVariantCells.map((cell) => (
                                <option key={cell.id || cell.label} value={cell.id || ""}>
                                  {cell.label} {cell.wholesalePrice ? `(£${cell.wholesalePrice})` : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                          {/* Custom price */}
                          <div>
                            {idx === 0 && <label className="block text-xs font-medium text-slate-500 mb-1">Price (£)</label>}
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={bp.custom_price}
                              onChange={(e) => {
                                const updated = [...buyerPricing];
                                updated[idx] = { ...updated[idx], custom_price: e.target.value };
                                setBuyerPricing(updated);
                              }}
                              placeholder="0.00"
                              className={inputClassName + " w-24 text-sm"}
                            />
                          </div>
                          {/* Delete button */}
                          <div>
                            {idx === 0 && <label className="block text-xs font-medium text-slate-500 mb-1">&nbsp;</label>}
                            <button
                              type="button"
                              onClick={() => setBuyerPricing(buyerPricing.filter((_, i) => i !== idx))}
                              className="p-2.5 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
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
                href="/inventory/products"
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
