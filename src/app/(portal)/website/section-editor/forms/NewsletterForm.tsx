"use client";

import type { NewsletterSectionData } from "@/lib/website-sections/types";
import { FormField, TextInput, SelectInput } from "./FormField";
import { AiGenerateButton } from "@/components/AiGenerateButton";

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
        <div className="flex items-start gap-1">
          <div className="flex-1">
            <TextInput value={data.heading} onChange={(heading) => update({ heading })} placeholder="Stay in the Loop" />
          </div>
          <AiGenerateButton
            type="website_heading"
            context={{ sectionType: "newsletter signup", existingContent: data.heading }}
            onSelect={(text) => update({ heading: text })}
          />
        </div>
      </FormField>
      <FormField label="Subheading">
        <div className="flex items-start gap-1">
          <div className="flex-1">
            <TextInput value={data.subheading} onChange={(subheading) => update({ subheading })} placeholder="Subscribe for updates..." multiline rows={2} />
          </div>
          <AiGenerateButton
            type="website_body"
            context={{ sectionType: "newsletter signup", existingContent: data.subheading }}
            onSelect={(text) => update({ subheading: text })}
          />
        </div>
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
