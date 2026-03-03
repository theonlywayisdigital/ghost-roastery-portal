"use client";

import { useStorefront } from "./StorefrontProvider";
import { MotionSection } from "./MotionWrapper";

const PLACEHOLDER_REVIEWS = [
  {
    id: 1,
    name: "Sarah M.",
    text: "Absolutely incredible coffee. The freshness is unmatched and you can really taste the difference.",
    rating: 5,
  },
  {
    id: 2,
    name: "James T.",
    text: "Been ordering for months now. Consistently excellent roasts and the delivery is always quick.",
    rating: 5,
  },
  {
    id: 3,
    name: "Emma R.",
    text: "Best speciality coffee I've found online. The single origin options are outstanding.",
    rating: 5,
  },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg
          key={i}
          className="w-4 h-4 text-amber-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function ReviewsSection() {
  const { primary } = useStorefront();

  // TODO: Replace with real reviews from DB
  return (
    <MotionSection className="py-16 md:py-24 bg-slate-50">
      <div className="max-w-6xl mx-auto px-6">
        <h2
          className="text-2xl md:text-3xl font-bold mb-10 text-center"
          style={{ color: primary }}
        >
          What Our Customers Say
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLACEHOLDER_REVIEWS.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-xl border border-slate-200 p-6"
            >
              <StarRating count={review.rating} />
              <p className="mt-4 text-slate-600 leading-relaxed text-sm">
                &ldquo;{review.text}&rdquo;
              </p>
              <p className="mt-4 text-sm font-semibold text-slate-900">
                {review.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </MotionSection>
  );
}
