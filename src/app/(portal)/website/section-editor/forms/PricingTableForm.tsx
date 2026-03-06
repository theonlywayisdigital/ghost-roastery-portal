"use client";

import type { PricingTableSectionData, PricingTier } from "@/lib/website-sections/types";
import { FormField, TextInput, Toggle } from "./FormField";
import { ArrayField } from "./ArrayField";

interface PricingTableFormProps {
  data: PricingTableSectionData;
  onChange: (data: PricingTableSectionData) => void;
}

export function PricingTableForm({ data, onChange }: PricingTableFormProps) {
  function update(partial: Partial<PricingTableSectionData>) {
    onChange({ ...data, ...partial });
  }

  return (
    <div>
      <FormField label="Heading">
        <TextInput
          value={data.heading}
          onChange={(heading) => update({ heading })}
          placeholder="Simple Pricing"
        />
      </FormField>

      <FormField label="Subheading">
        <TextInput
          value={data.subheading}
          onChange={(subheading) => update({ subheading })}
          placeholder="Choose the plan that works for you."
          multiline
          rows={2}
        />
      </FormField>

      <ArrayField<PricingTier>
        label="Pricing Tiers"
        items={data.tiers}
        onChange={(tiers) => update({ tiers })}
        createItem={() => ({
          name: "New Tier",
          price: "£0",
          period: "/month",
          features: ["Feature 1"],
          button: { text: "Get Started", url: "/shop" },
          highlighted: false,
        })}
        maxItems={5}
        itemLabel="Tier"
        renderItem={(tier, _i, updateTier) => (
          <div className="space-y-2">
            <FormField label="Name">
              <TextInput
                value={tier.name}
                onChange={(name) => updateTier({ ...tier, name })}
                placeholder="Starter"
              />
            </FormField>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Price">
                <TextInput
                  value={tier.price}
                  onChange={(price) => updateTier({ ...tier, price })}
                  placeholder="£19"
                />
              </FormField>
              <FormField label="Period">
                <TextInput
                  value={tier.period}
                  onChange={(period) => updateTier({ ...tier, period })}
                  placeholder="/month"
                />
              </FormField>
            </div>
            <Toggle
              checked={tier.highlighted}
              onChange={(highlighted) => updateTier({ ...tier, highlighted })}
              label="Highlighted (recommended)"
            />
            <FormField label="Features (one per line)">
              <TextInput
                value={tier.features.join("\n")}
                onChange={(v) => updateTier({ ...tier, features: v.split("\n").filter(Boolean) })}
                multiline
                rows={4}
                placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
              />
            </FormField>
            <div className="border-t border-neutral-100 pt-2 mt-2">
              <p className="text-xs font-medium text-neutral-500 mb-2">Button</p>
              <FormField label="Text">
                <TextInput
                  value={tier.button.text}
                  onChange={(text) => updateTier({ ...tier, button: { ...tier.button, text } })}
                  placeholder="Get Started"
                />
              </FormField>
              <FormField label="URL">
                <TextInput
                  value={tier.button.url}
                  onChange={(url) => updateTier({ ...tier, button: { ...tier.button, url } })}
                  placeholder="/shop"
                />
              </FormField>
            </div>
          </div>
        )}
      />
    </div>
  );
}
