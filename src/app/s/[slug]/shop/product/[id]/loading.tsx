import { Skeleton } from "../../../_components/Skeleton";

export default function ProductDetailLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header spacer */}
      <div className="h-16 md:h-20" />

      <div className="max-w-6xl mx-auto px-6 py-8 md:py-12">
        {/* Breadcrumb */}
        <div className="flex gap-2 mb-8 animate-pulse">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {/* Image */}
          <Skeleton className="aspect-square w-full rounded-xl" />

          {/* Details */}
          <div className="space-y-4 animate-pulse">
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-5 w-32" />
            <div className="space-y-2 pt-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="pt-4">
              <Skeleton className="h-5 w-16 mb-2" />
              <Skeleton className="h-10 w-36" />
            </div>
            <Skeleton className="h-12 w-full rounded-lg mt-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
