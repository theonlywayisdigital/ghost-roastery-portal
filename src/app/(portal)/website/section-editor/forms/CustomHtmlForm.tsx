"use client";

import type { CustomHtmlSectionData } from "@/lib/website-sections/types";
import { FormField, TextInput } from "./FormField";

interface CustomHtmlFormProps {
  data: CustomHtmlSectionData;
  onChange: (data: CustomHtmlSectionData) => void;
}

export function CustomHtmlForm({ data, onChange }: CustomHtmlFormProps) {
  return (
    <div>
      <FormField label="Custom HTML" description="Script tags will be stripped for security. Use this for embeds, iframes, or custom widgets.">
        <TextInput
          value={data.html}
          onChange={(html) => onChange({ ...data, html })}
          placeholder="<div>Your custom HTML here...</div>"
          multiline
          rows={12}
        />
      </FormField>
    </div>
  );
}
