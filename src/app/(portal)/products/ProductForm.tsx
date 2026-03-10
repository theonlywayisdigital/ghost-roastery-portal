"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  X,
  ImageIcon,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
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
  product_type: "retail" | "wholesale" | "both";
  retail_price: number | null;
  compare_at_price: number | null;
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
  shipping_cost: number | null;
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
  compare_at_price: number | null;
  wholesale_price_standard: number | null;
  wholesale_price_preferred: number | null;
  wholesale_price_vip: number | null;
  retail_stock_count: number | null;
  track_stock: boolean;
  is_active: boolean;
  sort_order: number;
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

function emptyVariant(sortOrder: number): Variant {
  return {
    weight_grams: null,
    unit: null,
    grind_type_id: null,
    sku: null,
    retail_price: null,
    compare_at_price: null,
    wholesale_price_standard: null,
    wholesale_price_preferred: null,
    wholesale_price_vip: null,
    retail_stock_count: null,
    track_stock: false,
    is_active: true,
    sort_order: sortOrder,
  };
}

const inputClassName =
  "w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent";

const labelClassName = "block text-sm font-medium text-slate-700 mb-1.5";

const sectionClassName = "border border-slate-200 rounded-lg p-5 space-y-5";

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const isEditing = !!product;

  // Universal fields
  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [metaDescription, setMetaDescription] = useState(product?.meta_description || "");
  const [productType, setProductType] = useState<"retail" | "wholesale" | "both">(
    product?.product_type || "retail"
  );
  const [imageUrl, setImageUrl] = useState(product?.image_url || "");
  const [sku, setSku] = useState(product?.sku || "");
  const [unit, setUnit] = useState(product?.unit || "250g");
  const [weightGrams, setWeightGrams] = useState(product?.weight_grams?.toString() || "");
  const [vatRate, setVatRate] = useState(product?.vat_rate?.toString() || "0");
  const [shippingCost, setShippingCost] = useState(product?.shipping_cost?.toString() || "");
  const [sortOrder, setSortOrder] = useState(product?.sort_order?.toString() || "0");
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [isPurchasable, setIsPurchasable] = useState(product?.is_purchasable ?? true);

  // Retail fields
  const [retailPrice, setRetailPrice] = useState(product?.retail_price?.toString() || "");
  const [compareAtPrice, setCompareAtPrice] = useState(product?.compare_at_price?.toString() || "");
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
  const [wholesalePriceStandard, setWholesalePriceStandard] = useState(
    product?.wholesale_price_standard?.toString() || ""
  );
  const [wholesalePricePreferred, setWholesalePricePreferred] = useState(
    product?.wholesale_price_preferred?.toString() || ""
  );
  const [wholesalePriceVip, setWholesalePriceVip] = useState(
    product?.wholesale_price_vip?.toString() || ""
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

  // Variant state
  const [variantsEnabled, setVariantsEnabled] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);
  const [confirmDeleteVariant, setConfirmDeleteVariant] = useState<number | null>(null);
  const [pricingOverrideOpen, setPricingOverrideOpen] = useState(false);

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

  const showRetail = productType === "retail" || productType === "both";
  const showWholesale = productType === "wholesale" || productType === "both";

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

  // Fetch existing variants when editing
  useEffect(() => {
    loadGrindTypes();

    if (isEditing) {
      fetch(`/api/products/${product.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.variants && data.variants.length > 0) {
            setVariants(data.variants);
            setVariantsEnabled(true);
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
        // Auto-select it in editing variant
        if (editingVariant) {
          setEditingVariant({ ...editingVariant, grind_type_id: data.grindType.id });
        }
      }
    } catch {
      // Silently fail
    }
    setAddingGrindType(false);
  }

  function handleStartAddVariant() {
    setEditingVariant(emptyVariant(variants.length));
    setEditingVariantIndex(null);
    setPricingOverrideOpen(false);
  }

  function handleStartEditVariant(index: number) {
    setEditingVariant({ ...variants[index] });
    setEditingVariantIndex(index);
    // Open pricing section if any pricing values are set
    const v = variants[index];
    const hasPricing = v.retail_price != null || v.compare_at_price != null ||
      v.wholesale_price_standard != null || v.wholesale_price_preferred != null ||
      v.wholesale_price_vip != null || v.track_stock;
    setPricingOverrideOpen(hasPricing);
  }

  function handleSaveVariant() {
    if (!editingVariant) return;
    if (editingVariantIndex !== null) {
      // Update existing
      setVariants((prev) => prev.map((v, i) => (i === editingVariantIndex ? editingVariant : v)));
    } else {
      // Add new
      setVariants((prev) => [...prev, editingVariant]);
    }
    setEditingVariant(null);
    setEditingVariantIndex(null);
  }

  function handleDeleteVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
    setConfirmDeleteVariant(null);
  }

  function getGrindTypeName(grindTypeId: string | null, variant?: Variant): string {
    if (!grindTypeId) return "—";
    // Check embedded grind_type first (from API response)
    if (variant?.grind_type?.name) return variant.grind_type.name;
    const gt = grindTypes.find((g) => g.id === grindTypeId);
    return gt?.name || "—";
  }

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
      product_type: productType,
      retail_price: showRetail && retailPrice ? parseFloat(retailPrice) : null,
      compare_at_price: showRetail && compareAtPrice ? parseFloat(compareAtPrice) : null,
      wholesale_price_standard: showWholesale && wholesalePriceStandard ? parseFloat(wholesalePriceStandard) : null,
      wholesale_price_preferred: showWholesale && wholesalePricePreferred ? parseFloat(wholesalePricePreferred) : null,
      wholesale_price_vip: showWholesale && wholesalePriceVip ? parseFloat(wholesalePriceVip) : null,
      minimum_wholesale_quantity: showWholesale ? parseInt(minWholesaleQty) || 1 : 1,
      sku: sku || null,
      weight_grams: weightGrams ? parseInt(weightGrams) : null,
      is_purchasable: isPurchasable,
      track_stock: trackStock,
      retail_stock_count: trackStock ? parseInt(stockCount) || 0 : null,
      brand: showRetail ? brand || null : null,
      gtin: showRetail ? gtin || null : null,
      google_product_category: showRetail ? googleProductCategory || null : null,
      vat_rate: parseFloat(vatRate) || 0,
      shipping_cost: shippingCost ? parseFloat(shippingCost) : null,
      rrp: showWholesale && rrp ? parseFloat(rrp) : null,
      order_multiples: showWholesale && orderMultiples ? parseInt(orderMultiples) : null,
      subscription_frequency: showRetail && subscriptionFrequency !== "none" ? subscriptionFrequency : null,
    };

    // Include variants when enabled
    if (variantsEnabled) {
      body.variants = variants.map((v) => ({
        id: v.id || undefined,
        weight_grams: v.weight_grams,
        unit: v.unit,
        grind_type_id: v.grind_type_id,
        sku: v.sku,
        retail_price: v.retail_price,
        compare_at_price: v.compare_at_price,
        wholesale_price_standard: v.wholesale_price_standard,
        wholesale_price_preferred: v.wholesale_price_preferred,
        wholesale_price_vip: v.wholesale_price_vip,
        retail_stock_count: v.retail_stock_count,
        track_stock: v.track_stock,
        is_active: v.is_active,
        sort_order: v.sort_order,
      }));
    } else if (isEditing) {
      // When variants are disabled on edit, send empty array to delete all
      body.variants = [];
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

      <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ─── Universal Section ─── */}
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

              {/* Product Type */}
              <div>
                <label className={labelClassName}>Product Type</label>
                <div className="flex gap-4">
                  {(["retail", "wholesale", "both"] as const).map((type) => (
                    <label
                      key={type}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                        productType === type
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-slate-300 text-slate-600 hover:border-slate-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="product_type"
                        value={type}
                        checked={productType === type}
                        onChange={() => setProductType(type)}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium capitalize">{type}</span>
                    </label>
                  ))}
                </div>
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

              {/* SKU & Unit */}
              <div className={`grid ${variantsEnabled ? "grid-cols-1" : "grid-cols-2"} gap-4`}>
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
                {!variantsEnabled && (
                  <div>
                    <label className={labelClassName}>Unit</label>
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="250g"
                      className={inputClassName}
                    />
                  </div>
                )}
              </div>

              {/* Weight & VAT */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClassName}>
                    Weight (grams){" "}
                    <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={weightGrams}
                    onChange={(e) => setWeightGrams(e.target.value)}
                    placeholder="250"
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

              {/* Shipping Cost & Sort Order */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClassName}>
                    Shipping Cost (£){" "}
                    <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value)}
                    placeholder="3.50"
                    className={inputClassName}
                  />
                </div>
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

          {/* ─── Variants Section ─── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800">Variants</h3>
              <Toggle
                enabled={variantsEnabled}
                onToggle={() => {
                  setVariantsEnabled(!variantsEnabled);
                  if (!variantsEnabled) {
                    setEditingVariant(null);
                    setEditingVariantIndex(null);
                  }
                }}
                label={variantsEnabled ? "Enabled" : "Disabled"}
              />
            </div>
            {variantsEnabled && (
              <div className={sectionClassName}>
                {/* Grind types notice / inline add */}
                {!grindTypesLoading && grindTypes.length === 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      No grind types set up. You can add them in{" "}
                      <Link href="/settings/grind-types" className="text-brand-600 hover:text-brand-700 font-medium">
                        Settings → Grind Types
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
                )}

                {/* Variant list */}
                {variants.length > 0 && (
                  <div className="space-y-2">
                    {variants.map((v, index) => (
                      <div
                        key={v.id || index}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="text-sm">
                            <span className="font-medium text-slate-900">
                              {v.unit || (v.weight_grams ? `${v.weight_grams}g` : "—")}
                            </span>
                            <span className="text-slate-400 mx-2">·</span>
                            <span className="text-slate-600">
                              {getGrindTypeName(v.grind_type_id, v)}
                            </span>
                            {v.sku && (
                              <>
                                <span className="text-slate-400 mx-2">·</span>
                                <span className="text-slate-400">{v.sku}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${v.is_active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                            {v.is_active ? "Active" : "Inactive"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStartEditVariant(index)}
                            className="p-1.5 text-slate-400 hover:text-slate-600"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {confirmDeleteVariant === index ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteVariant(index)}
                                className="px-2 py-1 text-xs bg-red-600 text-white rounded font-medium hover:bg-red-700"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteVariant(null)}
                                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteVariant(index)}
                              className="p-1.5 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add/Edit variant inline form */}
                {editingVariant ? (
                  <div className="border border-brand-200 bg-brand-50/30 rounded-lg p-4 space-y-4">
                    <h4 className="text-sm font-semibold text-slate-800">
                      {editingVariantIndex !== null ? "Edit Variant" : "Add Variant"}
                    </h4>

                    <div className="grid grid-cols-3 gap-4">
                      {/* Weight */}
                      <div>
                        <label className={labelClassName}>Weight (grams)</label>
                        <input
                          type="number"
                          min="0"
                          value={editingVariant.weight_grams ?? ""}
                          onChange={(e) =>
                            setEditingVariant({
                              ...editingVariant,
                              weight_grams: e.target.value ? parseInt(e.target.value) : null,
                            })
                          }
                          placeholder="250"
                          className={inputClassName}
                        />
                      </div>

                      {/* Unit label */}
                      <div>
                        <label className={labelClassName}>Unit Label</label>
                        <input
                          type="text"
                          value={editingVariant.unit || ""}
                          onChange={(e) =>
                            setEditingVariant({
                              ...editingVariant,
                              unit: e.target.value || null,
                            })
                          }
                          placeholder="e.g. 250g, 500g, 1kg"
                          className={inputClassName}
                        />
                        <p className="text-xs text-slate-400 mt-1">
                          Shown to customers as the variant size.
                        </p>
                      </div>

                      {/* Grind Type */}
                      <div>
                        <label className={labelClassName}>Grind Type</label>
                        <select
                          value={editingVariant.grind_type_id || ""}
                          onChange={(e) => {
                            if (e.target.value === "__add_new__") {
                              setShowInlineGrindAdd(true);
                              return;
                            }
                            setEditingVariant({
                              ...editingVariant,
                              grind_type_id: e.target.value || null,
                            });
                          }}
                          className={inputClassName}
                        >
                          <option value="">None</option>
                          {grindTypes.map((gt) => (
                            <option key={gt.id} value={gt.id}>
                              {gt.name}
                            </option>
                          ))}
                          <option value="__add_new__">+ Add new grind type</option>
                        </select>
                        {showInlineGrindAdd && (
                          <div className="flex items-center gap-2 mt-2">
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
                        )}
                      </div>
                    </div>

                    {/* SKU */}
                    <div>
                      <label className={labelClassName}>
                        SKU{" "}
                        <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={editingVariant.sku || ""}
                        onChange={(e) =>
                          setEditingVariant({ ...editingVariant, sku: e.target.value || null })
                        }
                        placeholder="GR-ETH-250-WB"
                        className={`${inputClassName} max-w-[240px]`}
                      />
                    </div>

                    {/* Active toggle */}
                    <Toggle
                      enabled={editingVariant.is_active}
                      onToggle={() =>
                        setEditingVariant({ ...editingVariant, is_active: !editingVariant.is_active })
                      }
                      label={editingVariant.is_active ? "Active" : "Inactive"}
                    />

                    {/* Pricing overrides — collapsible */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setPricingOverrideOpen(!pricingOverrideOpen)}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <span>Override pricing for this variant</span>
                        {pricingOverrideOpen ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                      {pricingOverrideOpen && (
                        <div className="px-4 pb-4 space-y-4 border-t border-slate-200 pt-4">
                          {/* Retail pricing overrides */}
                          {showRetail && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className={labelClassName}>Retail Price (£)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editingVariant.retail_price ?? ""}
                                  onChange={(e) =>
                                    setEditingVariant({
                                      ...editingVariant,
                                      retail_price: e.target.value ? parseFloat(e.target.value) : null,
                                    })
                                  }
                                  placeholder="Override"
                                  className={inputClassName}
                                />
                              </div>
                              <div>
                                <label className={labelClassName}>Compare-at Price (£)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editingVariant.compare_at_price ?? ""}
                                  onChange={(e) =>
                                    setEditingVariant({
                                      ...editingVariant,
                                      compare_at_price: e.target.value ? parseFloat(e.target.value) : null,
                                    })
                                  }
                                  placeholder="Override"
                                  className={inputClassName}
                                />
                              </div>
                            </div>
                          )}

                          {/* Wholesale pricing overrides */}
                          {showWholesale && (
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className={labelClassName}>Standard (£)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editingVariant.wholesale_price_standard ?? ""}
                                  onChange={(e) =>
                                    setEditingVariant({
                                      ...editingVariant,
                                      wholesale_price_standard: e.target.value ? parseFloat(e.target.value) : null,
                                    })
                                  }
                                  placeholder="Override"
                                  className={inputClassName}
                                />
                              </div>
                              <div>
                                <label className={labelClassName}>Preferred (£)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editingVariant.wholesale_price_preferred ?? ""}
                                  onChange={(e) =>
                                    setEditingVariant({
                                      ...editingVariant,
                                      wholesale_price_preferred: e.target.value ? parseFloat(e.target.value) : null,
                                    })
                                  }
                                  placeholder="Override"
                                  className={inputClassName}
                                />
                              </div>
                              <div>
                                <label className={labelClassName}>VIP (£)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editingVariant.wholesale_price_vip ?? ""}
                                  onChange={(e) =>
                                    setEditingVariant({
                                      ...editingVariant,
                                      wholesale_price_vip: e.target.value ? parseFloat(e.target.value) : null,
                                    })
                                  }
                                  placeholder="Override"
                                  className={inputClassName}
                                />
                              </div>
                            </div>
                          )}

                          {/* Stock tracking override */}
                          <div className="space-y-3">
                            <Toggle
                              enabled={editingVariant.track_stock}
                              onToggle={() =>
                                setEditingVariant({
                                  ...editingVariant,
                                  track_stock: !editingVariant.track_stock,
                                })
                              }
                              label={editingVariant.track_stock ? "Stock tracking enabled" : "Stock tracking disabled"}
                            />
                            {editingVariant.track_stock && (
                              <div>
                                <label className={labelClassName}>Stock Count</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editingVariant.retail_stock_count ?? ""}
                                  onChange={(e) =>
                                    setEditingVariant({
                                      ...editingVariant,
                                      retail_stock_count: e.target.value ? parseInt(e.target.value) : null,
                                    })
                                  }
                                  placeholder="0"
                                  className={`${inputClassName} max-w-[120px]`}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Save/Cancel buttons */}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingVariant(null);
                          setEditingVariantIndex(null);
                          setShowInlineGrindAdd(false);
                        }}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveVariant}
                        className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
                      >
                        {editingVariantIndex !== null ? "Update Variant" : "Save Variant"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartAddVariant}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Variant
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ─── Retail Section ─── */}
          {showRetail && (
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Retail</h3>
              <div className={sectionClassName}>
                {/* Retail Price & Compare-at */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClassName}>Retail Price (£)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={retailPrice}
                      onChange={(e) => setRetailPrice(e.target.value)}
                      placeholder="8.50"
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className={labelClassName}>
                      Compare-at Price (£){" "}
                      <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={compareAtPrice}
                      onChange={(e) => setCompareAtPrice(e.target.value)}
                      placeholder="10.00"
                      className={inputClassName}
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Shows as the original price with a strikethrough.
                    </p>
                  </div>
                </div>

                {variantsEnabled && (
                  <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                    These prices are used as defaults. Set per-variant pricing in the Variants section to override.
                  </p>
                )}

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
          )}

          {/* ─── Wholesale Section ─── */}
          {showWholesale && (
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Wholesale</h3>
              <div className={sectionClassName}>
                {/* 3-Tier Pricing */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelClassName}>Standard (£)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={wholesalePriceStandard}
                      onChange={(e) => setWholesalePriceStandard(e.target.value)}
                      placeholder="6.00"
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className={labelClassName}>Preferred (£)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={wholesalePricePreferred}
                      onChange={(e) => setWholesalePricePreferred(e.target.value)}
                      placeholder="5.50"
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className={labelClassName}>VIP (£)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={wholesalePriceVip}
                      onChange={(e) => setWholesalePriceVip(e.target.value)}
                      placeholder="5.00"
                      className={inputClassName}
                    />
                  </div>
                </div>

                {variantsEnabled && (
                  <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                    These prices are used as defaults. Set per-variant pricing in the Variants section to override.
                  </p>
                )}

                {/* RRP & Min Qty & Order Multiples */}
                <div className="grid grid-cols-3 gap-4">
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
  );
}
