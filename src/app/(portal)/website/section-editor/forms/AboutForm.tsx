"use client";

import type { AboutSectionData } from "@/lib/website-sections/types";
import { FormField, TextInput, SelectInput, Toggle } from "./FormField";
import { RichTextField } from "./RichTextField";
import { ImageUploadField } from "./ImageUploadField";

interface AboutFormProps {
  data: AboutSectionData;
  onChange: (data: AboutSectionData) => void;
  roasterId: string;
}

export function AboutForm({ data, onChange, roasterId }: AboutFormProps) {
  function update(partial: Partial<AboutSectionData>) {
    onChange({ ...data, ...partial });
  }

  return (
    <div>
      <FormField label="Heading">
        <TextInput
          value={data.heading}
          onChange={(heading) => update({ heading })}
          placeholder="Our Story"
        />
      </FormField>

      <RichTextField
        label="Body"
        value={data.body}
        onChange={(body) => update({ body })}
      />

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

      <Toggle
        label="Show social media links"
        checked={data.showSocialLinks}
        onChange={(showSocialLinks) => update({ showSocialLinks })}
      />
    </div>
  );
}
