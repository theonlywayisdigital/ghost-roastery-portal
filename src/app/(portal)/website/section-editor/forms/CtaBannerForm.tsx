"use client";

import type { CtaBannerSectionData } from "@/lib/website-sections/types";
import { FormField, TextInput, SelectInput } from "./FormField";
import { AiGenerateButton } from "@/components/AiGenerateButton";

interface CtaBannerFormProps {
  data: CtaBannerSectionData;
  onChange: (data: CtaBannerSectionData) => void;
}

export function CtaBannerForm({ data, onChange }: CtaBannerFormProps) {
  function update(partial: Partial<CtaBannerSectionData>) {
    onChange({ ...data, ...partial });
  }

  return (
    <div>
      <FormField label="Heading">
        <div className="flex items-start gap-1">
          <div className="flex-1">
            <TextInput
              value={data.heading}
              onChange={(heading) => update({ heading })}
              placeholder="Ready to try something new?"
            />
          </div>
          <AiGenerateButton
            type="website_heading"
            context={{ sectionType: "call to action", existingContent: data.heading }}
            onSelect={(text) => update({ heading: text })}
          />
        </div>
      </FormField>

      <FormField label="Subheading">
        <div className="flex items-start gap-1">
          <div className="flex-1">
            <TextInput
              value={data.subheading}
              onChange={(subheading) => update({ subheading })}
              placeholder="Order today and get free delivery..."
              multiline
              rows={2}
            />
          </div>
          <AiGenerateButton
            type="website_body"
            context={{ sectionType: "call to action", existingContent: data.subheading }}
            onSelect={(text) => update({ subheading: text })}
          />
        </div>
      </FormField>

      <FormField label="Background Style">
        <SelectInput
          value={data.backgroundStyle}
          onChange={(v) => update({ backgroundStyle: v as "primary" | "dark" | "gradient" })}
          options={[
            { value: "primary", label: "Primary Colour" },
            { value: "dark", label: "Dark" },
            { value: "gradient", label: "Gradient" },
          ]}
        />
      </FormField>

      <div className="border-t border-neutral-200 pt-4 mt-4">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Button</p>
        <FormField label="Text">
          <TextInput
            value={data.button.text}
            onChange={(text) => update({ button: { ...data.button, text } })}
            placeholder="Shop Now"
          />
        </FormField>
        <FormField label="URL">
          <TextInput
            value={data.button.url}
            onChange={(url) => update({ button: { ...data.button, url } })}
            placeholder="/shop"
          />
        </FormField>
      </div>
    </div>
  );
}
