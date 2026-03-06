"use client";

import type { FeaturedProductsSectionData } from "@/lib/website-sections/types";
import { FormField, TextInput, NumberInput, Toggle } from "./FormField";

interface FeaturedProductsFormProps {
  data: FeaturedProductsSectionData;
  onChange: (data: FeaturedProductsSectionData) => void;
}

export function FeaturedProductsForm({ data, onChange }: FeaturedProductsFormProps) {
  function update(partial: Partial<FeaturedProductsSectionData>) {
    onChange({ ...data, ...partial });
  }

  return (
    <div>
      <FormField label="Heading">
        <TextInput
          value={data.heading}
          onChange={(heading) => update({ heading })}
          placeholder="Our Coffee"
        />
      </FormField>

      <FormField label="Subheading">
        <TextInput
          value={data.subheading}
          onChange={(subheading) => update({ subheading })}
          placeholder="Hand-picked favourites..."
          multiline
          rows={2}
        />
      </FormField>

      <FormField label="Max Products" description="Number of products to show (2-8)">
        <NumberInput
          value={data.maxProducts}
          onChange={(maxProducts) => update({ maxProducts: Math.min(8, Math.max(2, maxProducts)) })}
          min={2}
          max={8}
        />
      </FormField>

      <Toggle
        label="Show 'View All Products' button"
        checked={data.showViewAll}
        onChange={(showViewAll) => update({ showViewAll })}
      />

      <p className="text-xs text-neutral-400 mt-4">
        Products are pulled automatically from your catalog. The most recently added products will be shown.
      </p>
    </div>
  );
}
