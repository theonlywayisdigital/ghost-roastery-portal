"use client";

import type { StatsCounterSectionData, StatItem } from "@/lib/website-sections/types";
import { FormField, TextInput, SelectInput } from "./FormField";
import { ArrayField } from "./ArrayField";

interface StatsCounterFormProps {
  data: StatsCounterSectionData;
  onChange: (data: StatsCounterSectionData) => void;
}

export function StatsCounterForm({ data, onChange }: StatsCounterFormProps) {
  function update(partial: Partial<StatsCounterSectionData>) {
    onChange({ ...data, ...partial });
  }

  return (
    <div>
      <FormField label="Heading">
        <TextInput
          value={data.heading}
          onChange={(heading) => update({ heading })}
          placeholder="By the Numbers"
        />
      </FormField>

      <FormField label="Background">
        <SelectInput
          value={data.background}
          onChange={(v) => update({ background: v as StatsCounterSectionData["background"] })}
          options={[
            { value: "white", label: "White" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
            { value: "primary", label: "Primary Colour" },
          ]}
        />
      </FormField>

      <ArrayField<StatItem>
        label="Stats"
        items={data.stats}
        onChange={(stats) => update({ stats })}
        createItem={() => ({ value: "0", label: "Label" })}
        maxItems={8}
        itemLabel="Stat"
        renderItem={(stat, _i, updateStat) => (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Value">
                <TextInput
                  value={stat.value}
                  onChange={(value) => updateStat({ ...stat, value })}
                  placeholder="10,000"
                />
              </FormField>
              <FormField label="Label">
                <TextInput
                  value={stat.label}
                  onChange={(label) => updateStat({ ...stat, label })}
                  placeholder="Bags Roasted"
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Prefix">
                <TextInput
                  value={stat.prefix ?? ""}
                  onChange={(prefix) => updateStat({ ...stat, prefix: prefix || undefined })}
                  placeholder="e.g. £"
                />
              </FormField>
              <FormField label="Suffix">
                <TextInput
                  value={stat.suffix ?? ""}
                  onChange={(suffix) => updateStat({ ...stat, suffix: suffix || undefined })}
                  placeholder="e.g. +"
                />
              </FormField>
            </div>
          </div>
        )}
      />
    </div>
  );
}
