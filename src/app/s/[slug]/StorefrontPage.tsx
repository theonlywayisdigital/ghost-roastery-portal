"use client";

import { useStorefront } from "./_components/StorefrontProvider";
import { Header } from "./_components/Header";
import { Cart } from "./_components/Cart";
import { HeroSection } from "./_components/HeroSection";
import { FeaturedProducts } from "./_components/FeaturedProducts";
import { AboutSection } from "./_components/AboutSection";
import { TradeSection } from "./_components/TradeSection";
import { ReviewsSection } from "./_components/ReviewsSection";
import { InstagramSection } from "./_components/InstagramSection";
import { Footer } from "./_components/Footer";
import { EnquiryForm } from "./EnquiryForm";
import type { Product } from "./_components/types";

export function StorefrontPage({ products }: { products: Product[] }) {
  const { roaster, slug, primary, accent, accentText, showWholesale } =
    useStorefront();

  return (
    <div
      style={{ fontFamily: "var(--sf-font)" }}
      className="min-h-screen bg-white"
    >
      <Header />
      <Cart />

      <HeroSection />
      <FeaturedProducts products={products} />
      <AboutSection />

      {/* Enquiry */}
      <section id="enquiry" className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-2xl mx-auto px-6">
          <h2
            className="text-2xl md:text-3xl font-bold mb-2 text-center"
            style={{ color: primary }}
          >
            Get in Touch
          </h2>
          <p className="text-slate-500 text-center mb-8">
            {`Have a question? Drop us a message and we\u2019ll get back to you.`}
          </p>
          <EnquiryForm
            roasterId={roaster.id}
            slug={slug}
            accentColour={accent}
            accentText={accentText}
            showBusinessField={showWholesale}
          />
        </div>
      </section>

      <TradeSection />
      <ReviewsSection />
      <InstagramSection />
      <Footer />
    </div>
  );
}
