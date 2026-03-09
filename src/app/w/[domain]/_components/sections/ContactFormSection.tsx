"use client";

import { motion } from "framer-motion";
import { getButtonRadius } from "@/lib/website-sections/types";
import type { ContactFormSectionData, WebsiteTheme } from "@/lib/website-sections/types";

interface ContactFormSectionProps {
  data: ContactFormSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

function FormInput({
  label,
  type = "text",
  theme,
  multiline,
}: {
  label: string;
  type?: string;
  theme: WebsiteTheme;
  multiline?: boolean;
}) {
  const inputStyle = {
    backgroundColor: `${theme.textColor}06`,
    borderColor: `${theme.textColor}15`,
    color: theme.textColor,
    fontFamily: theme.bodyFont,
  };

  return (
    <div>
      <label
        className="block text-sm font-medium mb-2 opacity-70"
        style={{ color: theme.textColor, fontFamily: theme.bodyFont }}
      >
        {label}
      </label>
      {multiline ? (
        <textarea
          rows={5}
          className="w-full border px-4 py-3 text-base outline-none transition-colors focus:border-current"
          style={{ ...inputStyle, borderRadius: getButtonRadius(theme) }}
          placeholder={`Your ${label.toLowerCase()}...`}
        />
      ) : (
        <input
          type={type}
          className="w-full border px-4 py-3 text-base outline-none transition-colors focus:border-current"
          style={{ ...inputStyle, borderRadius: getButtonRadius(theme) }}
          placeholder={`Your ${label.toLowerCase()}...`}
        />
      )}
    </div>
  );
}

export function ContactFormSection({ data, theme, isEditor }: ContactFormSectionProps) {
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
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-4"
              style={{ color: theme.textColor, fontFamily: theme.headingFont }}
            >
              {data.heading}
            </h2>
            {data.subheading && (
              <p
                className="text-lg md:text-xl opacity-70"
                style={{ color: theme.textColor, fontFamily: theme.bodyFont }}
              >
                {data.subheading}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <form
              className="space-y-4"
              onSubmit={(e) => e.preventDefault()}
            >
              {data.showName && <FormInput label="Name" theme={theme} />}
              {data.showEmail && <FormInput label="Email" type="email" theme={theme} />}
              {data.showPhone && <FormInput label="Phone" type="tel" theme={theme} />}
              {data.showSubject && <FormInput label="Subject" theme={theme} />}
              {data.showMessage && <FormInput label="Message" theme={theme} multiline />}
              <button
                type="submit"
                className="w-full px-6 py-3 text-base font-semibold transition-all duration-200 active:scale-[0.98]"
                style={{
                  backgroundColor: theme.primaryColor,
                  color: theme.backgroundColor,
                  borderRadius: getButtonRadius(theme),
                }}
              >
                {data.submitText}
              </button>
            </form>

            {data.showMap && data.mapAddress && (
              <div className="rounded-xl overflow-hidden min-h-[300px]">
                <iframe
                  title="Map"
                  className="w-full h-full min-h-[300px]"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(data.mapAddress)}&output=embed`}
                  style={{ border: 0 }}
                  loading="lazy"
                />
              </div>
            )}

            {data.showMap && !data.mapAddress && (
              <div
                className="rounded-xl flex items-center justify-center min-h-[300px]"
                style={{ backgroundColor: `${theme.textColor}06` }}
              >
                <p className="opacity-40 text-sm" style={{ color: theme.textColor }}>
                  Add a map address in settings
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
}
