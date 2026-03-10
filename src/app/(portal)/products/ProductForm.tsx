"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, X, ImageIcon } from "@/components/icons";
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

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showRetail = productType === "retail" || productType === "both";
  const showWholesale = productType === "wholesale" || productType === "both";

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

    const body = {
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

  const inputClassName =
    "w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent";

  const labelClassName = "block text-sm font-medium text-slate-700 mb-1.5";

  const sectionClassName = "border border-slate-200 rounded-lg p-5 space-y-5";

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
                  <label className={labelClassName}>Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="250g"
                    className={inputClassName}
                  />
                </div>
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

              {/* Shipping Cost */}
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
