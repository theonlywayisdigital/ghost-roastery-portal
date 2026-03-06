"use client";

import { motion } from "framer-motion";
import type { TestimonialsSectionData, Testimonial, WebsiteTheme } from "@/lib/website-sections/types";

interface TestimonialsSectionProps {
  data: TestimonialsSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

function StarRating({ rating, color }: { rating: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className="w-4 h-4"
          viewBox="0 0 20 20"
          fill={i < rating ? color : "none"}
          stroke={i < rating ? color : `${color}40`}
          strokeWidth={1.5}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function TestimonialCard({ testimonial, theme }: { testimonial: Testimonial; theme: WebsiteTheme }) {
  return (
    <div
      className="rounded-xl p-6 md:p-8 flex flex-col"
      style={{ backgroundColor: `${theme.textColor}06`, borderColor: `${theme.textColor}10` }}
    >
      <StarRating rating={testimonial.rating} color={theme.primaryColor} />
      <blockquote
        className="mt-4 text-base md:text-lg leading-relaxed flex-1 opacity-85"
        style={{ color: theme.textColor, fontFamily: theme.bodyFont }}
      >
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>
      <div className="flex items-center gap-3 mt-6 pt-6" style={{ borderTopColor: `${theme.textColor}10`, borderTopWidth: 1 }}>
        {testimonial.image ? (
          <img
            src={testimonial.image}
            alt={testimonial.author}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: `${theme.primaryColor}20`, color: theme.primaryColor }}
          >
            {testimonial.author.charAt(0)}
          </div>
        )}
        <div>
          <p
            className="font-semibold text-sm"
            style={{ color: theme.textColor, fontFamily: theme.headingFont }}
          >
            {testimonial.author}
          </p>
          {testimonial.role && (
            <p
              className="text-xs opacity-50"
              style={{ color: theme.textColor }}
            >
              {testimonial.role}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function TestimonialsSection({ data, theme, isEditor }: TestimonialsSectionProps) {
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.testimonials.map((testimonial, i) => (
            <TestimonialCard key={i} testimonial={testimonial} theme={theme} />
          ))}
        </div>
      </div>
    </Container>
  );
}
