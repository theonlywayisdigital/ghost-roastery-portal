"use client";

import type { NewsletterSectionData } from "@/lib/website-sections/types";
import { FormField, TextInput, SelectInput } from "./FormField";

interface NewsletterFormProps {
  data: NewsletterSectionData;
  onChange: (data: NewsletterSectionData) => void;
}

export function NewsletterForm({ data, onChange }: NewsletterFormProps) {
  function update(partial: Partial<NewsletterSectionData>) {
    onChange({ ...data, ...partial });
  }

  return (
    <div>
      <FormField label="Heading">
        <TextInput value={data.heading} onChange={(heading) => update({ heading })} placeholder="Stay in the Loop" />
      </FormField>
      <FormField label="Subheading">
        <TextInput value={data.subheading} onChange={(subheading) => update({ subheading })} placeholder="Subscribe for updates..." multiline rows={2} />
      </FormField>
      <FormField label="Button Text">
        <TextInput value={data.buttonText} onChange={(buttonText) => update({ buttonText })} placeholder="Subscribe" />
      </FormField>
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
    </div>
  );
}
