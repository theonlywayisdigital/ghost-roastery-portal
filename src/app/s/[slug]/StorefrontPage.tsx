"use client";

import { Header } from "./_components/Header";
import { Cart } from "./_components/Cart";
import { HeroSection } from "./_components/HeroSection";
import { FeaturedProducts } from "./_components/FeaturedProducts";
import { TradeSection } from "./_components/TradeSection";
import { Footer } from "./_components/Footer";
import type { Product } from "./_components/types";

export function StorefrontPage({ products }: { products: Product[] }) {
  return (
    <div
      style={{ fontFamily: "var(--sf-font)" }}
      className="min-h-screen"
    >
      <Header />
      <Cart />

      <HeroSection />
      <FeaturedProducts products={products} />
      <TradeSection />
      <Footer />
    </div>
  );
}
