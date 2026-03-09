"use client";

import type { TextContentSectionData } from "@/lib/website-sections/types";
import { FormField, TextInput, SelectInput } from "./FormField";
import { RichTextField } from "./RichTextField";
import { AiGenerateButton } from "@/components/AiGenerateButton";

interface TextContentFormProps {
  data: TextContentSectionData;
  onChange: (data: TextContentSectionData) => void;
}

export function TextContentForm({ data, onChange }: TextContentFormProps) {
  function update(partial: Partial<TextContentSectionData>) {
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
              placeholder="Brewing Guide"
            />
          </div>
          <AiGenerateButton
            type="website_heading"
            context={{ sectionType: "text content", existingContent: data.heading }}
            onSelect={(text) => update({ heading: text })}
          />
        </div>
      </FormField>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-neutral-700">Body</label>
          <AiGenerateButton
            type="website_body"
            context={{ sectionType: "text content", existingContent: data.body }}
            onSelect={(text) => update({ body: text })}
          />
        </div>
        <RichTextField
          label=""
          value={data.body}
          onChange={(body) => update({ body })}
        />
      </div>

      <FormField label="Background">
        <SelectInput
          value={data.background}
          onChange={(v) => update({ background: v as "white" | "light" | "dark" })}
          options={[
            { value: "white", label: "White" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </FormField>

      <FormField label="Content Width">
        <SelectInput
          value={data.maxWidth}
          onChange={(v) => update({ maxWidth: v as "narrow" | "medium" | "wide" })}
          options={[
            { value: "narrow", label: "Narrow" },
            { value: "medium", label: "Medium" },
            { value: "wide", label: "Wide" },
          ]}
        />
      </FormField>
    </div>
  );
}
