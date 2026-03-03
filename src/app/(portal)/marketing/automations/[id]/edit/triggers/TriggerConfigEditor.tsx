"use client";

import type { TriggerConfigField } from "@/types/marketing";

interface TriggerConfigEditorProps {
  fields: TriggerConfigField[];
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  dynamicOptions: Record<string, { value: string; label: string }[]>;
}

export function TriggerConfigEditor({ fields, config, onChange, dynamicOptions }: TriggerConfigEditorProps) {
  if (fields.length === 0) return null;

  function handleChange(key: string, value: unknown) {
    onChange({ ...config, [key]: value });
  }

  return (
    <div className="space-y-3 mt-3">
      {fields.map((field) => {
        const options = field.dynamicOptionsKey
          ? dynamicOptions[field.dynamicOptionsKey] || []
          : field.options || [];
        const currentValue = config[field.key];

        switch (field.type) {
          case "select":
            return (
              <div key={field.key}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{field.label}</label>
                <select
                  value={(currentValue as string) || ""}
                  onChange={(e) => handleChange(field.key, e.target.value || null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">{field.placeholder || "Any"}</option>
                  {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            );

          case "multiselect":
            return (
              <div key={field.key}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{field.label}</label>
                <div className="flex flex-wrap gap-1.5">
                  {options.map((opt) => {
                    const selected = Array.isArray(currentValue)
                      ? (currentValue as string[]).includes(opt.value)
                      : currentValue === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          const current = Array.isArray(currentValue) ? [...(currentValue as string[])] : [];
                          if (current.includes(opt.value)) {
                            handleChange(field.key, current.filter((v) => v !== opt.value));
                          } else {
                            handleChange(field.key, [...current, opt.value]);
                          }
                        }}
                        className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                          selected
                            ? "bg-brand-50 border-brand-300 text-brand-700 font-medium"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );

          case "number":
            return (
              <div key={field.key}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{field.label}</label>
                <input
                  type="number"
                  value={(currentValue as number) ?? ""}
                  onChange={(e) => handleChange(field.key, e.target.value ? parseInt(e.target.value) : null)}
                  placeholder={field.placeholder}
                  className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            );

          case "text":
            return (
              <div key={field.key}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{field.label}</label>
                <input
                  type="text"
                  value={(currentValue as string) || ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
