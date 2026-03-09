"use client";

import { motion } from "framer-motion";
import { getButtonRadius } from "@/lib/website-sections/types";
import type { EventsSectionData, WebsiteTheme } from "@/lib/website-sections/types";

interface EventsSectionProps {
  data: EventsSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function EventsSection({ data, theme, isEditor }: EventsSectionProps) {
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
    <Container {...containerProps} className="py-16 md:py-24" style={{ backgroundColor: theme.backgroundColor }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-4"
            style={{ color: theme.textColor, fontFamily: theme.headingFont }}
          >
            {data.heading}
          </h2>
          {data.subheading && (
            <p className="text-lg md:text-xl opacity-70 max-w-2xl mx-auto" style={{ color: theme.textColor, fontFamily: theme.bodyFont }}>
              {data.subheading}
            </p>
          )}
        </div>

        {data.events.length === 0 ? (
          <p className="text-center opacity-40 text-sm" style={{ color: theme.textColor }}>
            No upcoming events. Add events in the editor.
          </p>
        ) : data.layout === "list" ? (
          <div className="max-w-3xl mx-auto space-y-4">
            {data.events.map((event, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row gap-4 p-6 rounded-xl border"
                style={{ borderColor: `${theme.textColor}15`, backgroundColor: `${theme.textColor}04` }}
              >
                {event.image && (
                  <img src={event.image} alt={event.title} className="w-full sm:w-32 h-32 object-cover rounded-lg shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold mb-1" style={{ color: theme.textColor, fontFamily: theme.headingFont }}>
                    {event.title}
                  </h3>
                  <p className="text-sm font-medium mb-2" style={{ color: theme.primaryColor }}>
                    {formatDate(event.date)} · {event.time}
                  </p>
                  <p className="text-sm opacity-70" style={{ color: theme.textColor, fontFamily: theme.bodyFont }}>
                    {event.description}
                  </p>
                  {event.link && (
                    <a
                      href={event.link}
                      className="inline-block mt-3 text-sm font-semibold px-5 py-2 transition-all duration-200 active:scale-[0.98]"
                      style={{ backgroundColor: theme.primaryColor, color: theme.backgroundColor, borderRadius: getButtonRadius(theme) }}
                    >
                      Learn More
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.events.map((event, i) => (
              <div
                key={i}
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: `${theme.textColor}15`, backgroundColor: `${theme.textColor}04` }}
              >
                {event.image && (
                  <img src={event.image} alt={event.title} className="w-full h-48 object-cover" />
                )}
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: theme.primaryColor }}>
                    {formatDate(event.date)} · {event.time}
                  </p>
                  <h3 className="text-lg font-bold mb-2" style={{ color: theme.textColor, fontFamily: theme.headingFont }}>
                    {event.title}
                  </h3>
                  <p className="text-sm opacity-70 mb-4" style={{ color: theme.textColor, fontFamily: theme.bodyFont }}>
                    {event.description}
                  </p>
                  {event.link && (
                    <a
                      href={event.link}
                      className="inline-block text-sm font-semibold px-5 py-2 transition-all duration-200 active:scale-[0.98]"
                      style={{ backgroundColor: theme.primaryColor, color: theme.backgroundColor, borderRadius: getButtonRadius(theme) }}
                    >
                      Learn More
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
