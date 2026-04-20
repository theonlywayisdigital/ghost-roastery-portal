"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "@/components/icons";

export interface FilterConfig {
  key: string;
  label: string;
  type: "select" | "search" | "date-range";
  options?: { value: string; label: string }[];
}

interface FilterBarProps {
  filters: FilterConfig[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear: () => void;
}

export function FilterBar({ filters, values, onChange, onClear }: FilterBarProps) {
  const [searchInput, setSearchInput] = useState(values.search || "");
  const hasActiveFilters = Object.values(values).some((v) => v !== "");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Debounce search input — only fires when searchInput actually changes
  useEffect(() => {
    const timeout = setTimeout(() => onChangeRef.current("search", searchInput), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (values.search !== undefined && values.search !== searchInput) {
      setSearchInput(values.search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.search]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {filters.map((filter) => {
        if (filter.type === "search") {
          return (
            <div key={filter.key} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={filter.label}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 w-64"
              />
            </div>
          );
        }

        if (filter.type === "select") {
          return (
            <select
              key={filter.key}
              value={values[filter.key] || ""}
              onChange={(e) => onChange(filter.key, e.target.value)}
              className={`px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${
                values[filter.key] ? "text-slate-900" : "text-slate-400"
              }`}
            >
              <option value="">{filter.label}</option>
              {filter.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          );
        }

        if (filter.type === "date-range") {
          return (
            <div key={filter.key} className="flex items-center gap-2">
              <input
                type="date"
                value={values[`${filter.key}From`] || ""}
                onChange={(e) => onChange(`${filter.key}From`, e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <span className="text-slate-400 text-sm">to</span>
              <input
                type="date"
                value={values[`${filter.key}To`] || ""}
                onChange={(e) => onChange(`${filter.key}To`, e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          );
        }

        return null;
      })}

      {hasActiveFilters && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <X className="w-3 h-3" />
          Clear filters
        </button>
      )}
    </div>
  );
}
