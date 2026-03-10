"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { getButtonRadius } from "@/lib/website-sections/types";
import type { AllProductsSectionData, WebsiteTheme } from "@/lib/website-sections/types";
import type { ProductData } from "./FeaturedProductsSection";

interface AllProductsSectionProps {
  data: AllProductsSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
  products?: ProductData[];
  basePath?: string;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

export function AllProductsSection({ data, theme, isEditor, products, basePath }: AllProductsSectionProps) {
  const [search, setSearch] = useState("");
  const displayProducts = products ?? [];
  const showPlaceholders = displayProducts.length === 0;

  const filteredProducts = search
    ? displayProducts.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      )
    : displayProducts;

  const cols = { 2: "grid-cols-1 sm:grid-cols-2", 3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3", 4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" } as const;

  const Container = isEditor ? "div" : motion.section;
  const containerProps = isEditor ? {} : {
    initial: { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-50px" },
    transition: { duration: 0.6, ease },
  };

  return (
    <Container {...containerProps} className="py-16 md:py-24" style={{ backgroundColor: theme.backgroundColor }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2
          className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-8 text-center"
          style={{ color: theme.textColor, fontFamily: theme.headingFont }}
        >
          {data.heading}
        </h2>

        {data.showSearch && (
          <div className="max-w-md mx-auto mb-8">
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border px-4 py-3 text-base outline-none"
              style={{
                backgroundColor: `${theme.textColor}06`,
                borderColor: `${theme.textColor}15`,
                color: theme.textColor,
                borderRadius: getButtonRadius(theme),
              }}
            />
          </div>
        )}

        <div className={`grid ${cols[data.columns]} gap-4 md:gap-6`}>
          {showPlaceholders
            ? Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="rounded-xl overflow-hidden" style={{ backgroundColor: `${theme.textColor}08` }}>
                  <div className="aspect-square" style={{ backgroundColor: `${theme.primaryColor}10` }} />
                  <div className="p-4">
                    <div className="h-4 rounded w-3/4 mb-2" style={{ backgroundColor: `${theme.textColor}10` }} />
                    <div className="h-4 rounded w-1/3" style={{ backgroundColor: `${theme.primaryColor}20` }} />
                  </div>
                </div>
              ))
            : filteredProducts.map((product) => (
                <a
                  key={product.id}
                  href={product.slug ? `${basePath || ""}/shop/${product.slug}` : "#"}
                  className="group rounded-xl overflow-hidden transition-transform duration-200 hover:scale-[1.02]"
                  style={{ backgroundColor: `${theme.textColor}08` }}
                >
                  <div className="aspect-square overflow-hidden">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full" style={{ backgroundColor: `${theme.primaryColor}10` }} />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-base mb-1" style={{ color: theme.textColor }}>{product.name}</h3>
                    {product.description && (
                      <p className="text-sm mb-2 line-clamp-2 opacity-70" style={{ color: theme.textColor }}>{product.description}</p>
                    )}
                    <p className="font-medium" style={{ color: theme.primaryColor }}>£{product.price.toFixed(2)}</p>
                  </div>
                </a>
              ))}
        </div>
      </div>
    </Container>
  );
}
