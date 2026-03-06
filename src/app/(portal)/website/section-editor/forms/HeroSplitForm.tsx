"use client";

import type { HeroSplitSectionData } from "@/lib/website-sections/types";
import { FormField, TextInput, SelectInput } from "./FormField";
import { ImageUploadField } from "./ImageUploadField";

interface HeroSplitFormProps {
  data: HeroSplitSectionData;
  onChange: (data: HeroSplitSectionData) => void;
  roasterId: string;
}

export function HeroSplitForm({ data, onChange, roasterId }: HeroSplitFormProps) {
  function update(partial: Partial<HeroSplitSectionData>) {
    onChange({ ...data, ...partial });
  }

  return (
    <div>
      <FormField label="Heading">
        <TextInput
          value={data.heading}
          onChange={(heading) => update({ heading })}
          placeholder="Crafted with Passion"
        />
      </FormField>

      <FormField label="Subheading">
        <TextInput
          value={data.subheading}
          onChange={(subheading) => update({ subheading })}
          placeholder="From bean to cup"
        />
      </FormField>

      <FormField label="Body">
        <TextInput
          value={data.body}
          onChange={(body) => update({ body })}
          placeholder="Tell your story..."
          multiline
          rows={4}
        />
      </FormField>

      <ImageUploadField
        label="Image"
        value={data.image}
        onChange={(image) => update({ image })}
        roasterId={roasterId}
      />

      <FormField label="Image Position">
        <SelectInput
          value={data.imagePosition}
          onChange={(v) => update({ imagePosition: v as "left" | "right" })}
          options={[
            { value: "left", label: "Left" },
            { value: "right", label: "Right" },
          ]}
        />
      </FormField>

      <div className="border-t border-neutral-200 pt-4 mt-4">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Button</p>
        <FormField label="Text">
          <TextInput
            value={data.button?.text ?? ""}
            onChange={(text) =>
              update({ button: { url: data.button?.url ?? "/shop", text } })
            }
            placeholder="Explore Our Range"
          />
        </FormField>
        <FormField label="URL">
          <TextInput
            value={data.button?.url ?? ""}
            onChange={(url) =>
              update({ button: { text: data.button?.text ?? "Explore", url } })
            }
            placeholder="/shop"
          />
        </FormField>
      </div>
    </div>
  );
}
