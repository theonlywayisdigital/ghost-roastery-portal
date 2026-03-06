"use client";

import { useEffect } from "react";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  image_url: string | null;
  sort_order: number;
  product_type: string;
  retail_price: number | null;
  is_purchasable: boolean;
  retail_stock_count: number | null;
  track_stock: boolean;
}

function postHeight() {
  const height = document.documentElement.scrollHeight;
  window.parent.postMessage({ type: "gr-embed-resize", height }, "*");
}

export function EmbedShop({
  roaster,
  products,
}: {
  roaster: {
    id: string;
    businessName: string;
    slug: string;
    accentColour: string;
    accentText: string;
    retailEnabled: boolean;
  };
  products: Product[];
}) {
  // Notify parent of height changes for auto-resizing iframe
  useEffect(() => {
    postHeight();
    const observer = new ResizeObserver(() => postHeight());
    observer.observe(document.body);
    return () => observer.disconnect();
  }, []);

  const storefrontBase =
    typeof window !== "undefined"
      ? `${window.location.origin}/s/${roaster.slug}`
      : `/s/${roaster.slug}`;

  function handleBuyNow(productId: string) {
    window.location.href = `${storefrontBase}/shop/product/${productId}?embedded=true`;
  }

  if (products.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-400 text-sm">No products available.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => {
          const displayPrice = product.retail_price ?? product.price;
          const outOfStock =
            product.track_stock &&
            product.retail_stock_count != null &&
            product.retail_stock_count <= 0;

          return (
            <div
              key={product.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="relative aspect-square bg-slate-100">
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg
                      className="w-12 h-12 text-slate-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  </div>
                )}
                {outOfStock && (
                  <div className="absolute top-3 right-3 bg-slate-800/80 text-white text-xs font-medium px-2.5 py-1 rounded-full">
                    Out of stock
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-slate-900 mb-1">
                  {product.name}
                </h3>
                {product.description && (
                  <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                    {product.description}
                  </p>
                )}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-slate-900">
                    {`\u00a3${displayPrice.toFixed(2)}`}
                    <span className="text-sm font-normal text-slate-400 ml-1">
                      {`/ ${product.unit}`}
                    </span>
                  </span>
                </div>
                <button
                  onClick={() => handleBuyNow(product.id)}
                  disabled={outOfStock}
                  style={
                    outOfStock
                      ? undefined
                      : {
                          backgroundColor: roaster.accentColour,
                          color: roaster.accentText,
                        }
                  }
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity ${
                    outOfStock
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "hover:opacity-90"
                  }`}
                >
                  {outOfStock
                    ? "Out of Stock"
                    : roaster.retailEnabled
                      ? "Buy Now"
                      : "View"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-center">
        <a
          href={`${storefrontBase}/shop?embedded=true`}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          {`Powered by Ghost Roastery`}
        </a>
      </div>
    </div>
  );
}
