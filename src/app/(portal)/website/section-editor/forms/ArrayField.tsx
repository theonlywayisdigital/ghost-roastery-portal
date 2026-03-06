"use client";

import type { ReactNode } from "react";

interface ArrayFieldProps<T> {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  createItem: () => T;
  renderItem: (item: T, index: number, update: (item: T) => void) => ReactNode;
  maxItems?: number;
  itemLabel?: string;
}

export function ArrayField<T>({
  label,
  items,
  onChange,
  createItem,
  renderItem,
  maxItems = 20,
  itemLabel = "item",
}: ArrayFieldProps<T>) {
  function addItem() {
    if (items.length >= maxItems) return;
    onChange([...items, createItem()]);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, item: T) {
    const next = [...items];
    next[index] = item;
    onChange(next);
  }

  function moveItem(from: number, to: number) {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-neutral-700">{label}</span>
        <span className="text-xs text-neutral-400">
          {items.length}{maxItems < 20 ? ` / ${maxItems}` : ""}
        </span>
      </div>

      <div className="space-y-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                {itemLabel} {i + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveItem(i, i - 1)}
                  disabled={i === 0}
                  className="w-5 h-5 rounded flex items-center justify-center text-neutral-400 hover:text-neutral-600 disabled:opacity-30"
                  title="Move up"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(i, i + 1)}
                  disabled={i === items.length - 1}
                  className="w-5 h-5 rounded flex items-center justify-center text-neutral-400 hover:text-neutral-600 disabled:opacity-30"
                  title="Move down"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="w-5 h-5 rounded flex items-center justify-center text-neutral-400 hover:text-red-500"
                  title="Remove"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {renderItem(item, i, (updated) => updateItem(i, updated))}
          </div>
        ))}
      </div>

      {items.length < maxItems && (
        <button
          type="button"
          onClick={addItem}
          className="mt-2 w-full rounded-md border border-dashed border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          + Add {itemLabel}
        </button>
      )}
    </div>
  );
}
