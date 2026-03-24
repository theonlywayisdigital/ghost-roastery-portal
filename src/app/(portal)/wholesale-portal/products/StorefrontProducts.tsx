"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, Plus, Pencil } from "@/components/icons";
import { RETAIL_ENABLED } from "@/lib/feature-flags";
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
  rectSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ProductVariant {
  id: string;
  retail_price: number | null;
  wholesale_price: number | null;
  is_active: boolean | null;
  unit: string | null;
  channel: string | null;
}

interface ProductImageRef {
  id: string;
  url: string;
  sort_order: number;
  is_primary: boolean;
}

interface Product {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  unit: string;
  image_url: string | null;
  product_images?: ProductImageRef[] | null;
  status: "draft" | "published";
  sort_order: number;
  is_retail: boolean;
  is_wholesale: boolean;
  retail_price: number | null;
  product_variants: ProductVariant[];
}

function getPrimaryImageUrl(product: Product): string | null {
  const imgs = product.product_images;
  if (imgs && imgs.length > 0) {
    const primary = imgs.find((i) => i.is_primary) || imgs.sort((a, b) => a.sort_order - b.sort_order)[0];
    return primary?.url || null;
  }
  return product.image_url;
}

function SortableProductCard({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center rounded-md bg-white/80 backdrop-blur-sm text-slate-400 hover:text-slate-600 hover:bg-white cursor-grab active:cursor-grabbing shadow-sm border border-slate-200/60 transition-colors"
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
      {children}
    </div>
  );
}

export function StorefrontProducts({ products: initialProducts }: { products: Product[] }) {
  const [products, setProducts] = useState(initialProducts);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = products.findIndex((p) => p.id === active.id);
    const newIndex = products.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(products, oldIndex, newIndex);
    setProducts(reordered);

    // Persist sort_order for each product whose position changed
    const minIdx = Math.min(oldIndex, newIndex);
    const maxIdx = Math.max(oldIndex, newIndex);
    for (let i = minIdx; i <= maxIdx; i++) {
      fetch(`/api/products/${reordered[i].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: i }),
      });
    }
  }

  async function toggleField(product: Product, field: "is_retail" | "is_wholesale") {
    const newValue = !product[field];

    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, [field]: newValue } : p))
    );

    const res = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: newValue }),
    });

    if (!res.ok) {
      // Revert on failure
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, [field]: !newValue } : p
        )
      );
    }
  }

  function hasWholesalePrice(product: Product): boolean {
    return product.product_variants?.some(
      (v) => v.wholesale_price != null && v.wholesale_price > 0
    ) ?? false;
  }

  function hasRetailPrice(product: Product): boolean {
    if (product.retail_price != null && product.retail_price > 0) return true;
    // For "other" products (and variants in general), check if any active variant has retail_price
    return product.product_variants?.some(
      (v) => v.is_active && v.retail_price != null && v.retail_price > 0
    ) ?? false;
  }

  function getUnitDisplay(product: Product): string {
    const activeVars = product.product_variants?.filter((v) => v.is_active) || [];
    if (activeVars.length === 0) return product.unit;
    const units = Array.from(new Set(activeVars.map((v) => v.unit).filter((u): u is string => !!u)));
    return units.length > 0 ? units.join(", ") : product.unit;
  }

  function getBasePriceDisplay(product: Product): string {
    if (product.retail_price != null && product.retail_price > 0) return `£${product.retail_price.toFixed(2)}`;
    return `£${product.price.toFixed(2)}`;
  }

  function getPriceDisplay(product: Product): string {
    const variants = product.product_variants?.filter((v) => v.is_active) || [];
    if (variants.length === 0) return getBasePriceDisplay(product);

    // Show only retail prices (not wholesale) for storefront display
    const retailPrices = variants
      .map((v) => v.retail_price)
      .filter((p): p is number => p != null && p > 0);
    if (retailPrices.length === 0) return getBasePriceDisplay(product);

    const min = Math.min(...retailPrices);
    const max = Math.max(...retailPrices);
    return min === max ? `£${min.toFixed(2)}` : `£${min.toFixed(2)} – £${max.toFixed(2)}`;
  }

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
          <Package className="w-6 h-6 text-slate-400" />
        </div>
        <h3 className="text-sm font-medium text-slate-900 mb-1">
          No products yet
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          {RETAIL_ENABLED ? "Add your first product to get your storefront live." : "Add your first product to get your wholesale portal live."}
        </p>
        <Link
          href="/products/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">
          {RETAIL_ENABLED ? "These products appear on your storefront." : "These products appear on your wholesale portal."}
        </p>
        <Link
          href="/products/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </Link>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={products.map((p) => p.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => {
              const isDraft = product.status === "draft";
              const retailEnabled = !isDraft && hasRetailPrice(product);
              const wholesaleEnabled = !isDraft && hasWholesalePrice(product);

              return (
                <SortableProductCard key={product.id} id={product.id}>
                  <div
                    className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${isDraft ? "opacity-70" : ""}`}
                  >
                    {/* Product image + name — clickable link to edit */}
                    <Link href={`/products/${product.id}`} className="block hover:opacity-90 transition-opacity">
                      <div className="relative">
                        {getPrimaryImageUrl(product) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getPrimaryImageUrl(product)!}
                            alt={product.name}
                            className="w-full h-40 object-cover"
                          />
                        ) : (
                          <div className="w-full h-40 bg-slate-100 flex items-center justify-center">
                            <Package className="w-8 h-8 text-slate-300" />
                          </div>
                        )}
                        {isDraft && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Draft
                          </span>
                        )}
                      </div>
                      <div className="px-4 pt-4">
                        <h3 className="text-sm font-medium text-slate-900 mb-0.5">
                          {product.name}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {getPriceDisplay(product)}{product.category !== "other" && ` / ${getUnitDisplay(product)}`}
                        </p>
                      </div>
                    </Link>

                    {/* Product controls */}
                    <div className="px-4 pb-4">

                      {/* Channel toggles */}
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
                        {/* Retail toggle */}
                        {RETAIL_ENABLED && (
                        <div className="flex flex-col">
                          <div className={`flex items-center gap-1.5 ${!retailEnabled ? "opacity-40 cursor-not-allowed" : ""}`}>
                            <button
                              type="button"
                              onClick={() => retailEnabled && toggleField(product, "is_retail")}
                              disabled={!retailEnabled}
                              className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${
                                !retailEnabled ? "bg-slate-200 cursor-not-allowed" :
                                product.is_retail ? "bg-brand-600 cursor-pointer" : "bg-slate-200 cursor-pointer"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                                  product.is_retail ? "translate-x-4" : "translate-x-0"
                                }`}
                              />
                            </button>
                            <span className="text-xs text-slate-500">Retail</span>
                          </div>
                          {!retailEnabled && (
                            <span
                              className="text-xs mt-0.5"
                              style={{ color: "color-mix(in srgb, currentColor 55%, transparent)" }}
                            >
                              {isDraft ? "Publish product first" : (
                                <Link href={`/products/${product.id}`}>
                                  No retail price — edit in Products
                                </Link>
                              )}
                            </span>
                          )}
                        </div>
                        )}

                        {/* Wholesale toggle */}
                        <div className="flex flex-col">
                          <div className={`flex items-center gap-1.5 ${!wholesaleEnabled ? "opacity-40 cursor-not-allowed" : ""}`}>
                            <button
                              type="button"
                              onClick={() => wholesaleEnabled && toggleField(product, "is_wholesale")}
                              disabled={!wholesaleEnabled}
                              className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${
                                !wholesaleEnabled ? "bg-slate-200 cursor-not-allowed" :
                                product.is_wholesale ? "bg-brand-600 cursor-pointer" : "bg-slate-200 cursor-pointer"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                                  product.is_wholesale ? "translate-x-4" : "translate-x-0"
                                }`}
                              />
                            </button>
                            <span className="text-xs text-slate-500">Wholesale</span>
                          </div>
                          {!wholesaleEnabled && (
                            <span
                              className="text-xs mt-0.5"
                              style={{ color: "color-mix(in srgb, currentColor 55%, transparent)" }}
                            >
                              {isDraft ? "Publish product first" : (
                                <Link href={`/products/${product.id}`}>
                                  No wholesale price — edit in Products
                                </Link>
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Edit link */}
                      <div className="flex justify-end mt-2">
                        <Link
                          href={`/products/${product.id}`}
                          className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </Link>
                      </div>
                    </div>
                  </div>
                </SortableProductCard>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
