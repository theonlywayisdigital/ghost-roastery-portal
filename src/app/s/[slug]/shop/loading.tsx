import { ProductCardSkeleton } from "../_components/Skeleton";

export default function ShopLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header spacer */}
      <div className="h-16 md:h-20" />

      <div className="max-w-6xl mx-auto px-6 py-8 md:py-12">
        {/* Title skeleton */}
        <div className="animate-pulse mb-8">
          <div className="h-4 w-24 bg-slate-200 rounded mb-6" />
          <div className="h-10 w-48 bg-slate-200 rounded mb-2" />
          <div className="h-5 w-72 bg-slate-200 rounded" />
        </div>

        {/* Filter bar skeleton */}
        <div className="flex gap-3 mb-8 animate-pulse">
          <div className="h-8 w-24 bg-slate-200 rounded-full" />
          <div className="h-8 w-16 bg-slate-200 rounded-full" />
          <div className="h-8 w-20 bg-slate-200 rounded-full" />
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
