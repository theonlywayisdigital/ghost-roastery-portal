"use client";

import { useMemo } from "react";
import type { GRField } from "@/lib/csv-import";

const GR_FIELD_OPTIONS: { value: GRField; label: string; group: string }[] = [
  { value: "ignore", label: "— Ignore —", group: "" },
  { value: "name", label: "Product Name", group: "Product" },
  { value: "description", label: "Description", group: "Product" },
  { value: "origin", label: "Origin", group: "Product" },
  { value: "tasting_notes", label: "Tasting Notes", group: "Product" },
  { value: "brand", label: "Brand", group: "Product" },
  { value: "image_url", label: "Image URL", group: "Product" },
  { value: "status", label: "Status", group: "Product" },
  { value: "is_retail", label: "Is Retail", group: "Product" },
  { value: "is_wholesale", label: "Is Wholesale", group: "Product" },
  { value: "minimum_wholesale_quantity", label: "Min Wholesale Qty", group: "Product" },
  { value: "sku", label: "SKU", group: "Variant" },
  { value: "retail_price", label: "Retail Price", group: "Variant" },
  { value: "wholesale_price", label: "Wholesale Price", group: "Variant" },
  { value: "weight", label: "Weight", group: "Variant" },
  { value: "grind_type", label: "Grind Type", group: "Variant" },
  { value: "retail_stock_count", label: "Stock Count", group: "Variant" },
  { value: "track_stock", label: "Track Stock", group: "Variant" },
  { value: "option1_name", label: "Option 1 Name", group: "Variant" },
  { value: "option1_value", label: "Option 1 Value", group: "Variant" },
  { value: "option2_name", label: "Option 2 Name", group: "Variant" },
  { value: "option2_value", label: "Option 2 Value", group: "Variant" },
  { value: "gtin", label: "GTIN / Barcode", group: "Meta" },
  { value: "vat_rate", label: "VAT Rate", group: "Meta" },
  { value: "meta_description", label: "Meta Description", group: "Meta" },
];

interface Props {
  csvHeaders: string[];
  sampleRows: Record<string, string>[];
  mapping: Record<string, GRField>;
  onMappingChange: (mapping: Record<string, GRField>) => void;
}

export function CsvFieldMapper({
  csvHeaders,
  sampleRows,
  mapping,
  onMappingChange,
}: Props) {
  const usedFields = useMemo(() => {
    const used = new Set<GRField>();
    for (const field of Object.values(mapping)) {
      if (field !== "ignore") used.add(field);
    }
    return used;
  }, [mapping]);

  const nameIsMapped = usedFields.has("name");

  function handleChange(csvHeader: string, grField: GRField) {
    onMappingChange({ ...mapping, [csvHeader]: grField });
  }

  function getSampleValue(header: string): string {
    for (const row of sampleRows) {
      const val = row[header]?.trim();
      if (val) return val.length > 40 ? val.slice(0, 40) + "…" : val;
    }
    return "";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Map CSV Columns</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Match each CSV column to the corresponding product field. Rows sharing the same Product Name will be grouped as variants.
          </p>
        </div>
        {!nameIsMapped && (
          <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
            Product Name must be mapped
          </span>
        )}
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                CSV Column
              </th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                Sample Data
              </th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                Maps To
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {csvHeaders.map((header) => {
              const currentField = mapping[header] || "ignore";
              const sample = getSampleValue(header);

              return (
                <tr
                  key={header}
                  className={
                    currentField === "ignore"
                      ? "bg-slate-50/50 opacity-60"
                      : ""
                  }
                >
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-slate-700">
                      {header}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-slate-400 font-mono text-xs">
                      {sample || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={currentField}
                      onChange={(e) =>
                        handleChange(header, e.target.value as GRField)
                      }
                      className={`w-full rounded-md border px-2.5 py-1.5 text-sm ${
                        currentField === "name"
                          ? "border-brand-300 bg-brand-50 text-brand-700"
                          : currentField === "ignore"
                            ? "border-slate-200 text-slate-400"
                            : "border-slate-200 text-slate-700"
                      }`}
                    >
                      {GR_FIELD_OPTIONS.map((opt) => {
                        const isUsedElsewhere =
                          opt.value !== "ignore" &&
                          usedFields.has(opt.value) &&
                          currentField !== opt.value;

                        return (
                          <option
                            key={opt.value}
                            value={opt.value}
                            disabled={isUsedElsewhere}
                          >
                            {opt.group ? `${opt.group} → ` : ""}
                            {opt.label}
                            {isUsedElsewhere ? " (already mapped)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
