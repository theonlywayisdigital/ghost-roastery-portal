"use client";

import Link from "next/link";
import { WholesaleApplyForm } from "@/app/s/[slug]/WholesaleApplyForm";
import { useStorefront } from "../../_components/StorefrontProvider";
import { Header } from "../../_components/Header";
import { Cart } from "../../_components/Cart";
import { Footer } from "../../_components/Footer";

export function WholesaleApplyPage({
  slug,
  roaster,
}: {
  slug: string;
  roaster: {
    id: string;
    businessName: string;
    logoUrl: string | null;
    primaryColour: string;
    accentColour: string;
    logoSize: "small" | "medium" | "large";
  };
}) {
  const { accent, accentText } = useStorefront();

  return (
    <div style={{ fontFamily: "var(--sf-font)" }} className="min-h-screen">
      <Header />
      <Cart />

      <div className="pt-28 pb-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <h1
            className="text-3xl md:text-4xl font-bold mb-2"
            style={{ color: "var(--sf-text)" }}
          >
            Apply for Wholesale
          </h1>
          <p
            className="text-base mb-10"
            style={{
              color: "color-mix(in srgb, var(--sf-text) 55%, transparent)",
            }}
          >
            Fill in the form below to apply for a wholesale account with{" "}
            {roaster.businessName}.
          </p>

          <WholesaleApplyForm
            roasterId={roaster.id}
            slug={slug}
            accentColour={accent}
            accentText={accentText}
          />

          {/* Sign in link */}
          <div className="mt-6 text-center">
            <p
              className="text-sm"
              style={{
                color: "color-mix(in srgb, var(--sf-text) 55%, transparent)",
              }}
            >
              Already have an account?{" "}
              <Link
                href={`/s/${slug}/wholesale/login`}
                className="font-medium hover:underline"
                style={{ color: accent }}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
