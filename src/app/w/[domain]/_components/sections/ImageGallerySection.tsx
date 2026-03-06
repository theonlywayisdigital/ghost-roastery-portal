"use client";

import { motion } from "framer-motion";
import type { ImageGallerySectionData, WebsiteTheme } from "@/lib/website-sections/types";

interface ImageGallerySectionProps {
  data: ImageGallerySectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

export function ImageGallerySection({ data, theme, isEditor }: ImageGallerySectionProps) {
  const Container = isEditor ? "div" : motion.section;
  const containerProps = isEditor ? {} : {
    initial: { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-50px" },
    transition: { duration: 0.6, ease },
  };

  const cols = { 2: "grid-cols-1 sm:grid-cols-2", 3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3", 4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" } as const;

  return (
    <Container {...containerProps} className="py-16 md:py-24" style={{ backgroundColor: theme.backgroundColor }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {data.heading && (
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-12 text-center"
            style={{ color: theme.textColor, fontFamily: theme.headingFont }}
          >
            {data.heading}
          </h2>
        )}

        {data.images.length === 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="aspect-square rounded-xl" style={{ backgroundColor: `${theme.primaryColor}10` }} />
            ))}
          </div>
        ) : (
          <div className={`grid ${cols[data.columns]} gap-4`}>
            {data.images.map((img, i) => (
              <div key={i} className="aspect-square rounded-xl overflow-hidden">
                <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
