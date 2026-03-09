"use client";

import { motion } from "framer-motion";
import type { LocationSectionData, WebsiteTheme } from "@/lib/website-sections/types";

interface LocationSectionProps {
  data: LocationSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

export function LocationSection({ data, theme, isEditor }: LocationSectionProps) {
  const Container = isEditor ? "div" : motion.section;
  const containerProps = isEditor
    ? {}
    : {
        initial: { opacity: 0, y: 40 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-50px" },
        transition: { duration: 0.6, ease },
      };

  const imageFirst = data.imagePosition === "left";

  const InfoContent = (
    <div className="flex flex-col justify-center">
      <h2
        className="text-3xl md:text-4xl font-black tracking-tight mb-4"
        style={{ color: theme.textColor, fontFamily: theme.headingFont }}
      >
        {data.heading}
      </h2>
      <p
        className="text-lg opacity-70 mb-6 whitespace-pre-line"
        style={{ color: theme.textColor, fontFamily: theme.bodyFont }}
      >
        {data.body}
      </p>

      {/* Address */}
      <div className="flex items-start gap-3 mb-4">
        <svg className="w-5 h-5 mt-0.5 shrink-0" style={{ color: theme.primaryColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
        <span className="text-sm" style={{ color: theme.textColor }}>{data.address}</span>
      </div>

      {/* Phone */}
      {data.phone && (
        <div className="flex items-center gap-3 mb-4">
          <svg className="w-5 h-5 shrink-0" style={{ color: theme.primaryColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
          <a href={`tel:${data.phone}`} className="text-sm hover:underline" style={{ color: theme.textColor }}>
            {data.phone}
          </a>
        </div>
      )}

      {/* Email */}
      {data.email && (
        <div className="flex items-center gap-3 mb-6">
          <svg className="w-5 h-5 shrink-0" style={{ color: theme.primaryColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
          <a href={`mailto:${data.email}`} className="text-sm hover:underline" style={{ color: theme.textColor }}>
            {data.email}
          </a>
        </div>
      )}

      {/* Opening Hours */}
      {data.openingHours.length > 0 && (
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider mb-3 opacity-60" style={{ color: theme.textColor }}>
            Opening Hours
          </h3>
          <div className="space-y-1.5">
            {data.openingHours.map((slot, i) => (
              <div key={i} className="flex justify-between text-sm" style={{ color: theme.textColor }}>
                <span className="font-medium">{slot.day}</span>
                <span className="opacity-70">{slot.hours}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const VisualContent = (
    <div className="space-y-4">
      {data.image ? (
        <img src={data.image} alt={data.heading} className="w-full rounded-xl object-cover max-h-[400px]" />
      ) : (
        <div
          className="rounded-xl flex items-center justify-center h-64"
          style={{ backgroundColor: `${theme.primaryColor}15` }}
        >
          <div className="text-center opacity-40" style={{ color: theme.textColor }}>
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
            <p className="text-sm font-medium">Upload an image</p>
          </div>
        </div>
      )}
      {data.showMap && data.address && (
        <div className="rounded-xl overflow-hidden h-64">
          <iframe
            title="Map"
            className="w-full h-full"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(data.address)}&output=embed`}
            style={{ border: 0 }}
            loading="lazy"
          />
        </div>
      )}
    </div>
  );

  return (
    <Container {...containerProps} className="py-16 md:py-24" style={{ backgroundColor: theme.backgroundColor }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {imageFirst ? (
            <>
              {VisualContent}
              {InfoContent}
            </>
          ) : (
            <>
              {InfoContent}
              {VisualContent}
            </>
          )}
        </div>
      </div>
    </Container>
  );
}
