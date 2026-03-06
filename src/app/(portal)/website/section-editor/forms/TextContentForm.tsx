"use client";

import type { TextContentSectionData } from "@/lib/website-sections/types";
import { FormField, TextInput, SelectInput } from "./FormField";
import { RichTextField } from "./RichTextField";

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
        <TextInput
          value={data.heading}
          onChange={(heading) => update({ heading })}
          placeholder="Brewing Guide"
        />
      </FormField>

      <RichTextField
        label="Body"
        value={data.body}
        onChange={(body) => update({ body })}
      />

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
