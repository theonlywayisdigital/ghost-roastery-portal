"use client";

import { useState, useEffect } from "react";
import type { NormalisedRoastedStock } from "@/lib/inventory-import";

interface GreenBeanOption {
  id: string;
  name: string;
  current_stock_kg: number;
  low_stock_threshold_kg: number | null;
  is_active: boolean;
}

function StockBadge({ bean }: { bean: GreenBeanOption | undefined }) {
  if (!bean) return null;
  const kg = Number(bean.current_stock_kg);
  const isLow =
    bean.low_stock_threshold_kg != null &&
    kg <= Number(bean.low_stock_threshold_kg);
  const isOut = kg <= 0;

  const className = isOut
    ? "bg-red-50 text-red-700"
    : isLow
      ? "bg-amber-50 text-amber-700"
      : "bg-green-50 text-green-700";

  const label = isOut
    ? "Out of stock"
    : isLow
      ? "Low stock"
      : `${kg.toFixed(1)} kg`;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

interface Props {
  stock: NormalisedRoastedStock[];
  greenBeanMappings: Record<number, string>;
  onMappingsChange: (mappings: Record<number, string>) => void;
}

export function GreenBeanLinkMapping({
  stock,
  greenBeanMappings,
  onMappingsChange,
}: Props) {
  const [greenBeans, setGreenBeans] = useState<GreenBeanOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tools/green-beans")
      .then((r) => r.json())
      .then((data) => {
        setGreenBeans(
          (data.greenBeans || []).filter((b: GreenBeanOption) => b.is_active)
        );
        setLoading(false);
      });
  }, []);

  // Auto-match CSV green_bean_name to existing beans on first load
  useEffect(() => {
    if (loading || greenBeans.length === 0) return;

    const initial: Record<number, string> = { ...greenBeanMappings };
    let changed = false;

    for (let i = 0; i < stock.length; i++) {
      if (initial[i]) continue; // already mapped
      const csvName = stock[i].green_bean_name;
      if (!csvName) continue;

      const match = greenBeans.find(
        (b) => b.name.toLowerCase().trim() === csvName.toLowerCase().trim()
      );
      if (match) {
        initial[i] = match.id;
        changed = true;
      }
    }

    if (changed) {
      onMappingsChange(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, greenBeans]);

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading green beans&hellip;</p>
      </div>
    );
  }

  if (greenBeans.length === 0) {
    return (
      <div className="bg-slate-50 rounded-lg p-6 text-center">
        <p className="text-sm text-slate-500 mb-1">
          No green bean records found.
        </p>
        <p className="text-xs text-slate-400">
          You can skip this step and link roasted stock to green beans later.
        </p>
      </div>
    );
  }

  function handleChange(index: number, greenBeanId: string) {
    const next = { ...greenBeanMappings };
    if (greenBeanId) {
      next[index] = greenBeanId;
    } else {
      delete next[index];
    }
    onMappingsChange(next);
  }

  const linkedCount = Object.values(greenBeanMappings).filter(Boolean).length;

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Link to Green Beans
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Optionally link each roasted stock item to a green bean source.
          {stock.some((s) => s.green_bean_name) &&
            " Items with a matching CSV name have been auto-linked."}
        </p>
      </div>

      <div className="space-y-3">
        {stock.map((item, i) => {
          const selectedId = greenBeanMappings[i] || "";
          const selectedBean = greenBeans.find((b) => b.id === selectedId);

          return (
            <div
              key={i}
              className="border border-slate-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {item.name}
                  </p>
                  {item.green_bean_name && (
                    <p className="text-xs text-slate-400">
                      CSV source: {item.green_bean_name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedId}
                  onChange={(e) => handleChange(i, e.target.value)}
                  className="flex-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700"
                >
                  <option value="">Not linked</option>
                  {greenBeans.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({Number(b.current_stock_kg).toFixed(1)} kg)
                    </option>
                  ))}
                </select>
                <StockBadge bean={selectedBean} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-xs text-slate-400 text-right">
        {linkedCount} of {stock.length} linked
      </div>
    </div>
  );
}
