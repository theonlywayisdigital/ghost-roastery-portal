"use client";

import Image from "next/image";
import Link from "next/link";
import { Tag, Download } from "@/components/icons";

interface Brand {
  brandName: string;
  labelFileUrl: string | null;
  mockupImageUrl: string | null;
  bagColour: string;
  orderCount: number;
}

export function MyBrandsGrid({ brands }: { brands: Brand[] }) {
  if (brands.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Tag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          No brands yet
        </h3>
        <p className="text-slate-500 mb-6">
          When you place orders with a brand name, they'll appear here.
        </p>
        <a
          href={`${process.env.NEXT_PUBLIC_SITE_URL || ""}/build`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
        >
          Build Your Coffee
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {brands.map((brand) => (
        <div
          key={brand.brandName}
          className="bg-white rounded-xl border border-slate-200 overflow-hidden"
        >
          {/* Mockup image */}
          <div className="h-40 bg-slate-100 flex items-center justify-center">
            {brand.mockupImageUrl ? (
              <Image
                src={brand.mockupImageUrl}
                alt={brand.brandName}
                width={160}
                height={160}
                className="h-full w-auto object-cover"
              />
            ) : (
              <Tag className="w-10 h-10 text-slate-300" />
            )}
          </div>

          {/* Info */}
          <div className="p-4">
            <h3 className="font-semibold text-slate-900 mb-1">
              {brand.brandName}
            </h3>
            <p className="text-sm text-slate-500 mb-3">
              {`${brand.orderCount} order${brand.orderCount !== 1 ? "s" : ""} · ${brand.bagColour}`}
            </p>

            <div className="flex items-center gap-3">
              {brand.labelFileUrl && (
                <a
                  href={brand.labelFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-brand-600 hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  Label file
                </a>
              )}
              <Link
                href={`${process.env.NEXT_PUBLIC_SITE_URL || ""}/build`}
                className="text-sm text-brand-600 hover:underline"
              >
                Reorder
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
