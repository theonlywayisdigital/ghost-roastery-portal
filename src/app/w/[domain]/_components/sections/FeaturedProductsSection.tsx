"use client";

import { motion } from "framer-motion";
import { getButtonRadius } from "@/lib/website-sections/types";
import type { FeaturedProductsSectionData, WebsiteTheme } from "@/lib/website-sections/types";

interface FeaturedProductsSectionProps {
  data: FeaturedProductsSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
  products?: ProductData[];
  basePath?: string;
}

export interface ProductData {
  id: string;
  name: string;
  price: number;
  image?: string;
  slug?: string;
  description?: string;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

function PlaceholderCard({ theme }: { theme: WebsiteTheme }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: `${theme.textColor}08` }}
    >
      <div
        className="aspect-square flex items-center justify-center"
        style={{ backgroundColor: `${theme.primaryColor}10` }}
      >
        <svg
          className="w-12 h-12 opacity-20"
          style={{ color: theme.textColor }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      </div>
      <div className="p-4">
        <div
          className="h-4 rounded w-3/4 mb-2"
          style={{ backgroundColor: `${theme.textColor}10` }}
        />
        <div
          className="h-4 rounded w-1/3"
          style={{ backgroundColor: `${theme.primaryColor}20` }}
        />
      </div>
    </div>
  );
}

function ProductCard({ product, theme, basePath }: { product: ProductData; theme: WebsiteTheme; basePath?: string }) {
  const shopBase = basePath ? `${basePath}/shop` : "/shop";
  return (
    <a
      href={product.slug ? `${shopBase}/${product.slug}` : "#"}
      className="group rounded-xl overflow-hidden transition-transform duration-200 hover:scale-[1.02]"
      style={{ backgroundColor: `${theme.textColor}08` }}
    >
      <div className="aspect-square overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: `${theme.primaryColor}10` }}
          >
            <svg
              className="w-12 h-12 opacity-20"
              style={{ color: theme.textColor }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3
          className="font-semibold text-base mb-1"
          style={{ color: theme.textColor, fontFamily: theme.headingFont }}
        >
          {product.name}
        </h3>
        {product.description && (
          <p
            className="text-sm mb-2 line-clamp-2 opacity-70"
            style={{ color: theme.textColor, fontFamily: theme.bodyFont }}
          >
            {product.description}
          </p>
        )}
        <p
          className="font-medium"
          style={{ color: theme.primaryColor }}
        >
          £{product.price.toFixed(2)}
        </p>
      </div>
    </a>
  );
}

export function FeaturedProductsSection({
  data,
  theme,
  isEditor,
  products,
  basePath,
}: FeaturedProductsSectionProps) {
  const displayProducts = products?.slice(0, data.maxProducts);
  const showPlaceholders = !displayProducts || displayProducts.length === 0;
  const placeholderCount = data.maxProducts;

  const Container = isEditor ? "div" : motion.section;
  const containerProps = isEditor
    ? {}
    : {
        initial: { opacity: 0, y: 40 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-50px" },
        transition: { duration: 0.6, ease },
      };

  return (
    <Container
      {...containerProps}
      className="py-16 md:py-24"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-4"
            style={{ color: theme.textColor, fontFamily: theme.headingFont }}
          >
            {data.heading}
          </h2>
          {data.subheading && (
            <p
              className="text-lg md:text-xl max-w-2xl mx-auto opacity-70"
              style={{ color: theme.textColor, fontFamily: theme.bodyFont }}
            >
              {data.subheading}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {showPlaceholders
            ? Array.from({ length: placeholderCount }, (_, i) => (
                <PlaceholderCard key={i} theme={theme} />
              ))
            : displayProducts.map((product) => (
                <ProductCard key={product.id} product={product} theme={theme} basePath={basePath} />
              ))}
        </div>

        {data.showViewAll && (
          <div className="text-center mt-10">
            <a
              href={basePath ? `${basePath}/shop` : "/shop"}
              className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold border-2 transition-all duration-200 active:scale-[0.98]"
              style={{
                borderColor: theme.primaryColor,
                color: theme.primaryColor,
                borderRadius: getButtonRadius(theme),
              }}
            >
              View All Products
            </a>
          </div>
        )}
      </div>
    </Container>
  );
}
