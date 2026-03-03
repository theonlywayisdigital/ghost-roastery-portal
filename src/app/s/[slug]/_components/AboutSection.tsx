"use client";

import Image from "next/image";
import { useStorefront } from "./StorefrontProvider";
import { SocialLinks } from "./SocialIcons";
import { MotionSection } from "./MotionWrapper";

export function AboutSection() {
  const { roaster, primary } = useStorefront();

  if (!roaster.brand_about) return null;

  return (
    <MotionSection id="about" className="py-16 md:py-24 bg-slate-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 items-center">
          {/* Image / Logo (shows first on mobile) */}
          {roaster.brand_logo_url && (
            <div className="md:col-span-2 flex justify-center order-first md:order-last">
              <Image
                src={roaster.brand_logo_url}
                alt={roaster.business_name}
                width={220}
                height={220}
                className="object-contain opacity-80"
              />
            </div>
          )}

          {/* Text */}
          <div className={roaster.brand_logo_url ? "md:col-span-3" : "md:col-span-5"}>
            <h2
              className="text-2xl md:text-3xl font-bold mb-4"
              style={{ color: primary }}
            >
              Our Story
            </h2>
            <p className="text-slate-600 leading-relaxed whitespace-pre-line text-base md:text-lg">
              {roaster.brand_about}
            </p>
            <div className="mt-6">
              <SocialLinks roaster={roaster} />
            </div>
          </div>
        </div>
      </div>
    </MotionSection>
  );
}
