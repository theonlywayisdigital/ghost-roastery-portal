"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useStorefront } from "./StorefrontProvider";

export function HeroSection() {
  const { roaster, slug, primary, accent, accentText, showWholesale } =
    useStorefront();

  return (
    <section className="relative w-full min-h-[80vh] md:min-h-screen flex items-end overflow-hidden">
      {/* Background */}
      {roaster.brand_hero_image_url ? (
        <div
          className="absolute inset-0 bg-cover bg-center md:bg-fixed"
          style={{
            backgroundImage: `url(${roaster.brand_hero_image_url})`,
          }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`,
          }}
        />
      )}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 pb-16 pt-32 md:pb-24">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.12 } },
          }}
        >
          <motion.h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 max-w-3xl"
            style={{ fontFamily: "var(--sf-font)" }}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.5 }}
          >
            {roaster.business_name}
          </motion.h1>

          {roaster.brand_tagline && (
            <motion.p
              className="text-lg md:text-xl lg:text-2xl text-white/85 mb-8 max-w-xl"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.5 }}
            >
              {roaster.brand_tagline}
            </motion.p>
          )}

          <motion.div
            className="flex flex-wrap gap-3"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.5 }}
          >
            <Link
              href={`/s/${slug}/shop`}
              style={{
                backgroundColor: "var(--sf-btn-colour)",
                color: "var(--sf-btn-text)",
                borderRadius: "var(--sf-btn-radius)",
              }}
              className="px-7 py-3.5 font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Shop Now
            </Link>
            {showWholesale && (
              <Link
                href={`/s/${slug}/wholesale`}
                className="px-7 py-3.5 font-semibold text-sm bg-white/15 text-white hover:bg-white/25 transition-colors backdrop-blur-sm border border-white/20"
                style={{ borderRadius: "var(--sf-btn-radius)" }}
              >
                Trade Enquiry
              </Link>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
