"use client";

import { ChevronLeft, ChevronRight } from "@/components/icons";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between py-4">
      <p className="text-sm text-slate-500">
        {`Showing ${start}–${end} of ${total}`}
      </p>

      <div className="flex items-center gap-4">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="px-2 py-1 bg-white border border-slate-200 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {[25, 50, 100].map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className={`p-1.5 rounded-md transition-colors ${
              page <= 1
                ? "text-slate-300 cursor-not-allowed"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-600 px-2">
            {`${page} / ${totalPages}`}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className={`p-1.5 rounded-md transition-colors ${
              page >= totalPages
                ? "text-slate-300 cursor-not-allowed"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
