"use client";

import type { AboutSectionData } from "@/lib/website-sections/types";
import { FormField, TextInput, SelectInput, Toggle } from "./FormField";
import { RichTextField } from "./RichTextField";
import { ImageUploadField } from "./ImageUploadField";
import { AiGenerateButton } from "@/components/AiGenerateButton";

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
        <div className="flex items-start gap-1">
          <div className="flex-1">
            <TextInput
              value={data.heading}
              onChange={(heading) => update({ heading })}
              placeholder="Our Story"
            />
          </div>
          <AiGenerateButton
            type="website_heading"
            context={{ sectionType: "about", existingContent: data.heading }}
            onSelect={(text) => update({ heading: text })}
          />
        </div>
      </FormField>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-neutral-700">Body</label>
          <AiGenerateButton
            type="website_body"
            context={{ sectionType: "about / our story", existingContent: data.body }}
            onSelect={(text) => update({ body: text })}
          />
        </div>
        <RichTextField
          label=""
          value={data.body}
          onChange={(body) => update({ body })}
        />
      </div>

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
