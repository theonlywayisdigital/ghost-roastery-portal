"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  X,
  ImageIcon,
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

interface WeightOption {
  weight_grams: number;
  unit: string;
}

interface MatrixCell {
  id?: string;
  sku: string | null;
  retail_price: number | null;
  compare_at_price: number | null;
  wholesale_price_standard: number | null;
  wholesale_price_preferred: number | null;
  wholesale_price_vip: number | null;
  retail_stock_count: number | null;
  track_stock: boolean;
  is_active: boolean;
}

function emptyCell(): MatrixCell {
  return {
    sku: null,
    retail_price: null,
    compare_at_price: null,
    wholesale_price_standard: null,
    wholesale_price_preferred: null,
    wholesale_price_vip: null,
    retail_stock_count: null,
    track_stock: false,
    is_active: true,
  };
}

function cellKey(weightGrams: number, grindTypeId: string): string {
  return `${weightGrams}:${grindTypeId}`;
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

  // Variant state — matrix model
  const [variantsEnabled, setVariantsEnabled] = useState(false);
  const [weightOptions, setWeightOptions] = useState<WeightOption[]>([]);
  const [selectedGrindTypeIds, setSelectedGrindTypeIds] = useState<Set<string>>(new Set());
  const [matrixCells, setMatrixCells] = useState<Record<string, MatrixCell>>({});
  const [expandedCell, setExpandedCell] = useState<string | null>(null);
  const [expandedSkuCell, setExpandedSkuCell] = useState<string | null>(null);

  // Weight add form
  const [newWeightGrams, setNewWeightGrams] = useState("");
  const [newWeightUnit, setNewWeightUnit] = useState("");

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

  // Fetch existing variants when editing — reconstruct matrix
  useEffect(() => {
    loadGrindTypes();

    if (isEditing) {
      fetch(`/api/products/${product.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.variants && data.variants.length > 0) {
            const variants: Variant[] = data.variants;
            setVariantsEnabled(true);

            // Extract unique weight options
            const weightMap = new Map<number, string>();
            for (const v of variants) {
              if (v.weight_grams != null && !weightMap.has(v.weight_grams)) {
                weightMap.set(v.weight_grams, v.unit || `${v.weight_grams}g`);
              }
            }
            const weights: WeightOption[] = Array.from(weightMap.entries()).map(
              ([wg, u]) => ({ weight_grams: wg, unit: u })
            );
            setWeightOptions(weights);

            // Extract unique grind type ids
            const gtIds = new Set<string>();
            for (const v of variants) {
              if (v.grind_type_id) gtIds.add(v.grind_type_id);
            }
            setSelectedGrindTypeIds(gtIds);

            // Populate matrix cells
            const cells: Record<string, MatrixCell> = {};
            for (const v of variants) {
              if (v.weight_grams != null && v.grind_type_id) {
                const key = cellKey(v.weight_grams, v.grind_type_id);
                cells[key] = {
                  id: v.id,
                  sku: v.sku,
                  retail_price: v.retail_price,
                  compare_at_price: v.compare_at_price,
                  wholesale_price_standard: v.wholesale_price_standard,
                  wholesale_price_preferred: v.wholesale_price_preferred,
                  wholesale_price_vip: v.wholesale_price_vip,
                  retail_stock_count: v.retail_stock_count,
                  track_stock: v.track_stock,
                  is_active: v.is_active,
                };
              }
            }
            setMatrixCells(cells);
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
        // Auto-select newly created grind type
        setSelectedGrindTypeIds((prev) => new Set([...Array.from(prev), data.grindType.id]));
      }
    } catch {
      // Silently fail
    }
    setAddingGrindType(false);
  }

  function handleAddWeight() {
    const grams = parseInt(newWeightGrams);
    if (!grams || grams <= 0) return;
    const unitLabel = newWeightUnit.trim() || `${grams}g`;
    // Prevent duplicate weight_grams
    if (weightOptions.some((w) => w.weight_grams === grams)) return;
    setWeightOptions((prev) => [...prev, { weight_grams: grams, unit: unitLabel }]);
    setNewWeightGrams("");
    setNewWeightUnit("");
  }

  function handleRemoveWeight(grams: number) {
    setWeightOptions((prev) => prev.filter((w) => w.weight_grams !== grams));
  }

  function handleToggleGrindType(gtId: string) {
    setSelectedGrindTypeIds((prev) => {
      const next = new Set(Array.from(prev));
      if (next.has(gtId)) {
        next.delete(gtId);
      } else {
        next.add(gtId);
      }
      return next;
    });
  }

  function getCell(key: string): MatrixCell {
    return matrixCells[key] || emptyCell();
  }

  function updateCell(key: string, updates: Partial<MatrixCell>) {
    setMatrixCells((prev) => ({
      ...prev,
      [key]: { ...getCell(key), ...updates },
    }));
  }

  // Get selected grind types in their original sort order
  const selectedGrindTypes = grindTypes.filter((gt) => selectedGrindTypeIds.has(gt.id));
  const showMatrix = weightOptions.length > 0 && selectedGrindTypes.length > 0;

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

    // Convert matrix to flat variants array
    if (variantsEnabled && showMatrix) {
      const flatVariants: Record<string, unknown>[] = [];
      weightOptions.forEach((w, rowIdx) => {
        selectedGrindTypes.forEach((gt, colIdx) => {
          const key = cellKey(w.weight_grams, gt.id);
          const cell = getCell(key);
          flatVariants.push({
            id: cell.id || undefined,
            weight_grams: w.weight_grams,
            unit: w.unit,
            grind_type_id: gt.id,
            sku: cell.sku,
            retail_price: cell.retail_price,
            compare_at_price: cell.compare_at_price,
            wholesale_price_standard: cell.wholesale_price_standard,
            wholesale_price_preferred: cell.wholesale_price_preferred,
            wholesale_price_vip: cell.wholesale_price_vip,
            retail_stock_count: cell.retail_stock_count,
            track_stock: cell.track_stock,
            is_active: cell.is_active,
            sort_order: rowIdx * 100 + colIdx,
          });
        });
      });
      body.variants = flatVariants;
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
                onToggle={() => setVariantsEnabled(!variantsEnabled)}
                label={variantsEnabled ? "Enabled" : "Disabled"}
              />
            </div>
            {variantsEnabled && (
              <div className="space-y-5">
                {/* ── Step 1: Define Options ── */}
                <div className={sectionClassName}>
                  <h4 className="text-sm font-semibold text-slate-800">Define Options</h4>
                  <div className="grid grid-cols-2 gap-6">
                    {/* Panel 1 — Weights */}
                    <div className="space-y-3">
                      <label className={labelClassName}>Weight options</label>
                      {weightOptions.length > 0 && (
                        <div className="space-y-1.5">
                          {weightOptions.map((w) => (
                            <div
                              key={w.weight_grams}
                              className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 bg-white"
                            >
                              <span className="text-sm text-slate-900">
                                {w.unit}
                                {w.unit !== `${w.weight_grams}g` && (
                                  <span className="text-slate-400 ml-1.5">{`— ${w.weight_grams}g`}</span>
                                )}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveWeight(w.weight_grams)}
                                className="p-0.5 text-slate-400 hover:text-red-500"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="block text-xs text-slate-500 mb-1">Weight (g)</label>
                          <input
                            type="number"
                            min="1"
                            value={newWeightGrams}
                            onChange={(e) => setNewWeightGrams(e.target.value)}
                            placeholder="250"
                            className={inputClassName}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddWeight();
                              }
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-slate-500 mb-1">Unit label</label>
                          <input
                            type="text"
                            value={newWeightUnit}
                            onChange={(e) => setNewWeightUnit(e.target.value)}
                            placeholder="e.g. 250g, 1kg"
                            className={inputClassName}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddWeight();
                              }
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddWeight}
                          disabled={!newWeightGrams || parseInt(newWeightGrams) <= 0}
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
                                  checked={selectedGrindTypeIds.has(gt.id)}
                                  onChange={() => handleToggleGrindType(gt.id)}
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

                {/* ── Step 2: Combination Matrix ── */}
                {showMatrix && (
                  <div className={sectionClassName}>
                    <h4 className="text-sm font-semibold text-slate-800">
                      {`Combinations (${weightOptions.length * selectedGrindTypes.length})`}
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-2 pr-4 font-medium text-slate-500 text-xs uppercase tracking-wide">
                              Weight
                            </th>
                            {selectedGrindTypes.map((gt) => (
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
                          {weightOptions.map((w) => (
                            <tr key={w.weight_grams} className="border-b border-slate-100 last:border-0">
                              <td className="py-3 pr-4 font-medium text-slate-900 align-top whitespace-nowrap">
                                {w.unit}
                              </td>
                              {selectedGrindTypes.map((gt) => {
                                const key = cellKey(w.weight_grams, gt.id);
                                const cell = getCell(key);
                                const isExpanded = expandedCell === key;
                                const isSkuExpanded = expandedSkuCell === key;
                                return (
                                  <td key={gt.id} className="py-3 px-3 align-top">
                                    <div className="space-y-2">
                                      {/* Active toggle */}
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateCell(key, { is_active: !cell.is_active })
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
                                            updateCell(key, {
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
                                          onClick={() => setExpandedSkuCell(key)}
                                          className="text-xs text-slate-400 hover:text-slate-600"
                                        >
                                          + SKU
                                        </button>
                                      )}

                                      {/* Pricing link / panel */}
                                      {isExpanded ? (
                                        <div className="space-y-2 p-2 border border-slate-200 rounded-lg bg-slate-50/50">
                                          {showRetail && (
                                            <>
                                              <div>
                                                <label className="block text-xs text-slate-500 mb-0.5">
                                                  Retail (£)
                                                </label>
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  min="0"
                                                  value={cell.retail_price ?? ""}
                                                  onChange={(e) =>
                                                    updateCell(key, {
                                                      retail_price: e.target.value
                                                        ? parseFloat(e.target.value)
                                                        : null,
                                                    })
                                                  }
                                                  placeholder="Override"
                                                  className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs text-slate-500 mb-0.5">
                                                  Compare-at (£)
                                                </label>
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  min="0"
                                                  value={cell.compare_at_price ?? ""}
                                                  onChange={(e) =>
                                                    updateCell(key, {
                                                      compare_at_price: e.target.value
                                                        ? parseFloat(e.target.value)
                                                        : null,
                                                    })
                                                  }
                                                  placeholder="Override"
                                                  className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                                />
                                              </div>
                                            </>
                                          )}
                                          {showWholesale && (
                                            <>
                                              <div>
                                                <label className="block text-xs text-slate-500 mb-0.5">
                                                  Standard (£)
                                                </label>
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  min="0"
                                                  value={
                                                    cell.wholesale_price_standard ?? ""
                                                  }
                                                  onChange={(e) =>
                                                    updateCell(key, {
                                                      wholesale_price_standard: e.target
                                                        .value
                                                        ? parseFloat(e.target.value)
                                                        : null,
                                                    })
                                                  }
                                                  placeholder="Override"
                                                  className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs text-slate-500 mb-0.5">
                                                  Preferred (£)
                                                </label>
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  min="0"
                                                  value={
                                                    cell.wholesale_price_preferred ?? ""
                                                  }
                                                  onChange={(e) =>
                                                    updateCell(key, {
                                                      wholesale_price_preferred: e.target
                                                        .value
                                                        ? parseFloat(e.target.value)
                                                        : null,
                                                    })
                                                  }
                                                  placeholder="Override"
                                                  className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs text-slate-500 mb-0.5">
                                                  VIP (£)
                                                </label>
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  min="0"
                                                  value={
                                                    cell.wholesale_price_vip ?? ""
                                                  }
                                                  onChange={(e) =>
                                                    updateCell(key, {
                                                      wholesale_price_vip: e.target.value
                                                        ? parseFloat(e.target.value)
                                                        : null,
                                                    })
                                                  }
                                                  placeholder="Override"
                                                  className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                                />
                                              </div>
                                            </>
                                          )}
                                          {/* Stock tracking */}
                                          <div className="space-y-1.5">
                                            <div className="flex items-center gap-2">
                                              <input
                                                type="checkbox"
                                                checked={cell.track_stock}
                                                onChange={() =>
                                                  updateCell(key, {
                                                    track_stock: !cell.track_stock,
                                                  })
                                                }
                                                className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                              />
                                              <span className="text-xs text-slate-600">
                                                Track stock
                                              </span>
                                            </div>
                                            {cell.track_stock && (
                                              <input
                                                type="number"
                                                min="0"
                                                value={cell.retail_stock_count ?? ""}
                                                onChange={(e) =>
                                                  updateCell(key, {
                                                    retail_stock_count: e.target.value
                                                      ? parseInt(e.target.value)
                                                      : null,
                                                  })
                                                }
                                                placeholder="Stock qty"
                                                className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                              />
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => setExpandedCell(null)}
                                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                                          >
                                            Done
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => setExpandedCell(key)}
                                          className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                                        >
                                          Pricing
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
