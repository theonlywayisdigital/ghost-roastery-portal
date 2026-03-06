"use client";

import type { AllProductsSectionData } from "@/lib/website-sections/types";
import { FormField, TextInput, SelectInput, Toggle } from "./FormField";

interface AllProductsFormProps {
  data: AllProductsSectionData;
  onChange: (data: AllProductsSectionData) => void;
}

export function AllProductsForm({ data, onChange }: AllProductsFormProps) {
  function update(partial: Partial<AllProductsSectionData>) {
    onChange({ ...data, ...partial });
  }

  return (
    <div>
      <FormField label="Heading">
        <TextInput value={data.heading} onChange={(heading) => update({ heading })} placeholder="Shop All Coffee" />
      </FormField>
      <Toggle label="Show search bar" checked={data.showSearch} onChange={(showSearch) => update({ showSearch })} />
      <Toggle label="Show filters" checked={data.showFilters} onChange={(showFilters) => update({ showFilters })} />
      <FormField label="Columns">
        <SelectInput
          value={String(data.columns)}
          onChange={(v) => update({ columns: Number(v) as 2 | 3 | 4 })}
          options={[
            { value: "2", label: "2 Columns" },
            { value: "3", label: "3 Columns" },
            { value: "4", label: "4 Columns" },
          ]}
        />
      </FormField>
    </div>
  );
}
