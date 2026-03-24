"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, X, ImageIcon } from "@/components/icons";
import Link from "next/link";
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
import { restrictToParentElement } from "@dnd-kit/modifiers";
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
  description: string | null;
  price: number;
  unit: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  is_retail: boolean;
  is_wholesale: boolean;
  retail_price: number | null;
  wholesale_price: number | null;
  minimum_wholesale_quantity: number | null;
  sku: string | null;
  weight_grams: number | null;
  is_purchasable: boolean;
  track_stock: boolean;
  retail_stock_count: number | null;
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
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.url} alt="" className="w-24 h-24 object-cover rounded-lg border border-slate-200" />
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

export function AdminProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const isEditing = !!product;

  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [price, setPrice] = useState(product?.price?.toString() || "");
  const [unit, setUnit] = useState(product?.unit || "250g");
  const [images, setImages] = useState<ProductImage[]>([]);
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(product?.sort_order?.toString() || "0");

  const [isRetail, setIsRetail] = useState(product?.is_retail ?? true);
  const [isWholesale, setIsWholesale] = useState(product?.is_wholesale ?? false);
  const [retailPrice, setRetailPrice] = useState(product?.retail_price?.toString() || "");
  const [wholesalePrice, setWholesalePrice] = useState(
    product?.wholesale_price?.toString() || ""
  );
  const [minWholesaleQty, setMinWholesaleQty] = useState(
    product?.minimum_wholesale_quantity?.toString() || "1"
  );
  const [sku, setSku] = useState(product?.sku || "");
  const [weightGrams, setWeightGrams] = useState(product?.weight_grams?.toString() || "");
  const [isPurchasable, setIsPurchasable] = useState(product?.is_purchasable ?? true);
  const [trackStock, setTrackStock] = useState(product?.track_stock ?? false);
  const [stockCount, setStockCount] = useState(
    product?.retail_stock_count?.toString() || "0"
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showRetail = isRetail;
  const showWholesale = isWholesale;

  const imageSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // Load existing images on edit
  useEffect(() => {
    if (!isEditing) return;
    fetch(`/api/admin/products/${product.id}/images`)
      .then((res) => res.json())
      .then((data) => {
        if (data.images) setImages(data.images);
      })
      .catch(() => {});
  }, [isEditing, product?.id]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    // Copy files BEFORE resetting input — FileList is a live reference
    // that gets emptied when the input value is cleared
    const files = Array.from(fileList);

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
      return filtered.map((img, i) => ({ ...img, sort_order: i, is_primary: i === 0 }));
    });
  }

  function handleImageDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setImages((prev) => {
      const oldIndex = prev.findIndex((img) => img.id === active.id);
      const newIndex = prev.findIndex((img) => img.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      return reordered.map((img, i) => ({ ...img, sort_order: i, is_primary: i === 0 }));
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const body = {
      name,
      description: description || null,
      price: parseFloat(price) || 0,
      unit,
      image_url: images[0]?.url || null,
      is_active: isActive,
      sort_order: parseInt(sortOrder) || 0,
      is_retail: isRetail,
      is_wholesale: isWholesale,
      retail_price: showRetail && retailPrice ? parseFloat(retailPrice) : null,
      wholesale_price: showWholesale && wholesalePrice ? parseFloat(wholesalePrice) : null,
      minimum_wholesale_quantity: showWholesale ? parseInt(minWholesaleQty) || 1 : 1,
      sku: sku || null,
      weight_grams: weightGrams ? parseInt(weightGrams) : null,
      is_purchasable: isPurchasable,
      track_stock: trackStock,
      retail_stock_count: trackStock ? parseInt(stockCount) || 0 : null,
    };

    try {
      const res = await fetch(
        isEditing ? `/api/admin/products/${product.id}` : "/api/admin/products",
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

      // Sync images
      if (productId) {
        try {
          const imgRes = await fetch(`/api/admin/products/${productId}/images`);
          const imgData = imgRes.ok ? await imgRes.json() : { images: [] };
          const existingImages: ProductImage[] = imgData.images || [];
          const existingIds = new Set(existingImages.map((i) => i.id));

          for (const existing of existingImages) {
            if (!images.find((i) => i.id === existing.id)) {
              await fetch(`/api/admin/products/${productId}/images/${existing.id}`, { method: "DELETE" });
            }
          }

          for (const img of images) {
            if (!existingIds.has(img.id)) {
              await fetch(`/api/admin/products/${productId}/images`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: img.url, storage_path: img.storage_path }),
              });
            }
          }

          const reorderRes = await fetch(`/api/admin/products/${productId}/images`);
          if (reorderRes.ok) {
            const reorderData = await reorderRes.json();
            const serverImages: ProductImage[] = reorderData.images || [];
            const orderedIds: string[] = [];
            for (const uiImg of images) {
              const match = serverImages.find((s) => s.url === uiImg.url);
              if (match) orderedIds.push(match.id);
            }
            if (orderedIds.length > 0) {
              await fetch(`/api/admin/products/${productId}/images/reorder`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageIds: orderedIds }),
              });
            }
          }
        } catch {
          // Non-critical
        }
      }

      router.push("/admin/products");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }

  const inputClassName =
    "w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent";

  const labelClassName = "block text-sm font-medium text-slate-700 mb-1.5";

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/products"
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
        <form onSubmit={handleSubmit} className="space-y-5">
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

          <div>
            <label className={labelClassName}>
              Description{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tasting notes, origin details..."
              rows={3}
              className={inputClassName}
            />
          </div>

          {/* Channels */}
          <div>
            <label className={labelClassName}>Channels</label>
            <div className="flex gap-4">
              <Toggle
                enabled={isRetail}
                onToggle={() => setIsRetail(!isRetail)}
                label="Retail"
              />
              <Toggle
                enabled={isWholesale}
                onToggle={() => setIsWholesale(!isWholesale)}
                label="Wholesale"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            {showRetail && (
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
            )}
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

          {/* Legacy price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClassName}>
                Price (£){" "}
                <span className="text-slate-400 font-normal">(legacy)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="8.50"
                className={inputClassName}
              />
            </div>
          </div>

          {/* Wholesale Pricing */}
          {showWholesale && (
            <div className="border border-slate-200 rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-semibold text-slate-800">Wholesale Pricing</h3>
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
                  <label className={labelClassName}>Minimum Wholesale Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={minWholesaleQty}
                    onChange={(e) => setMinWholesaleQty(e.target.value)}
                    placeholder="1"
                    className={`${inputClassName} max-w-[120px]`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* SKU & Weight */}
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

          {/* Sort Order */}
          <div>
            <label className={labelClassName}>Sort Order</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="0"
              className={`${inputClassName} max-w-[120px]`}
            />
            <p className="text-xs text-slate-400 mt-1">
              Lower numbers appear first.
            </p>
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

          {/* Purchasable Toggle */}
          <Toggle
            enabled={isPurchasable}
            onToggle={() => setIsPurchasable(!isPurchasable)}
            label={
              isPurchasable
                ? "Purchasable — customers can buy online"
                : "Not purchasable — enquiry only"
            }
          />

          {/* Active Toggle */}
          <Toggle
            enabled={isActive}
            onToggle={() => setIsActive(!isActive)}
            label={
              isActive
                ? "Active — visible to customers"
                : "Inactive — hidden from customers"
            }
          />

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
              href="/admin/products"
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
