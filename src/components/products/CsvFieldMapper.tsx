"use client";

import { useMemo } from "react";

export interface FieldOption<T extends string = string> {
  value: T;
  label: string;
  group: string;
}

interface Props<T extends string = string> {
  csvHeaders: string[];
  sampleRows: Record<string, string>[];
  mapping: Record<string, T>;
  onMappingChange: (mapping: Record<string, T>) => void;
  fieldOptions: FieldOption<T>[];
  requiredField: T;
  requiredFieldLabel: string;
}

export function CsvFieldMapper<T extends string = string>({
  csvHeaders,
  sampleRows,
  mapping,
  onMappingChange,
  fieldOptions,
  requiredField,
  requiredFieldLabel,
}: Props<T>) {
  const usedFields = useMemo(() => {
    const used = new Set<T>();
    for (const field of Object.values(mapping) as T[]) {
      if (field !== ("ignore" as T)) used.add(field);
    }
    return used;
  }, [mapping]);

  const requiredIsMapped = usedFields.has(requiredField);

  function handleChange(csvHeader: string, field: T) {
    onMappingChange({ ...mapping, [csvHeader]: field });
  }

  function getSampleValue(header: string): string {
    for (const row of sampleRows) {
      const val = row[header]?.trim();
      if (val) return val.length > 40 ? val.slice(0, 40) + "\u2026" : val;
    }
    return "";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Map CSV Columns</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Match each CSV column to the corresponding field.
          </p>
        </div>
        {!requiredIsMapped && (
          <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
            {requiredFieldLabel} must be mapped
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
              const currentField = mapping[header] || ("ignore" as T);
              const sample = getSampleValue(header);

              return (
                <tr
                  key={header}
                  className={
                    currentField === ("ignore" as T)
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
                      {sample || "\u2014"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={currentField}
                      onChange={(e) =>
                        handleChange(header, e.target.value as T)
                      }
                      className={`w-full rounded-md border px-2.5 py-1.5 text-sm ${
                        currentField === requiredField
                          ? "border-brand-300 bg-brand-50 text-brand-700"
                          : currentField === ("ignore" as T)
                            ? "border-slate-200 text-slate-400"
                            : "border-slate-200 text-slate-700"
                      }`}
                    >
                      {fieldOptions.map((opt) => {
                        const isUsedElsewhere =
                          opt.value !== ("ignore" as T) &&
                          usedFields.has(opt.value) &&
                          currentField !== opt.value;

                        return (
                          <option
                            key={opt.value}
                            value={opt.value}
                            disabled={isUsedElsewhere}
                          >
                            {opt.group ? `${opt.group} \u2192 ` : ""}
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
