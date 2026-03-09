"use client";

import { useEffect, useState } from "react";
import type { FormEmbedSectionData } from "@/lib/website-sections/types";
import { FormField, TextInput } from "./FormField";
import { AiGenerateButton } from "@/components/AiGenerateButton";

interface FormOption {
  id: string;
  name: string;
}

interface FormEmbedFormProps {
  data: FormEmbedSectionData;
  onChange: (data: FormEmbedSectionData) => void;
  roasterId: string;
}

export function FormEmbedForm({ data, onChange, roasterId }: FormEmbedFormProps) {
  const [forms, setForms] = useState<FormOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/marketing/forms")
      .then((res) => (res.ok ? res.json() : { forms: [] }))
      .then((json) => {
        setForms(
          (json.forms || []).map((f: { id: string; name: string }) => ({
            id: f.id,
            name: f.name,
          }))
        );
      })
      .catch(() => setForms([]))
      .finally(() => setLoading(false));
  }, [roasterId]);

  function update(partial: Partial<FormEmbedSectionData>) {
    onChange({ ...data, ...partial });
  }

  const selectedForm = forms.find((f) => f.id === data.formId);

  return (
    <div>
      <FormField label="Form">
        {loading ? (
          <div className="text-xs text-neutral-400 py-2">Loading forms...</div>
        ) : forms.length === 0 ? (
          <div className="text-xs text-neutral-400 py-2">
            No marketing forms found. Create one in Marketing &rarr; Forms.
          </div>
        ) : (
          <select
            value={data.formId}
            onChange={(e) => update({ formId: e.target.value })}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900"
          >
            <option value="">Select a form...</option>
            {forms.map((form) => (
              <option key={form.id} value={form.id}>
                {form.name}
              </option>
            ))}
          </select>
        )}
      </FormField>

      {selectedForm && (
        <p className="text-xs text-neutral-400 -mt-2 mb-3">
          Selected: {selectedForm.name}
        </p>
      )}

      <FormField label="Heading (optional)">
        <div className="flex items-start gap-1">
          <div className="flex-1">
            <TextInput
              value={data.heading}
              onChange={(heading) => update({ heading })}
              placeholder="e.g. Get in Touch"
            />
          </div>
          <AiGenerateButton
            type="website_heading"
            context={{ sectionType: "marketing form / contact form", existingContent: data.heading }}
            onSelect={(text) => update({ heading: text })}
          />
        </div>
      </FormField>

      <FormField label="Subheading (optional)">
        <div className="flex items-start gap-1">
          <div className="flex-1">
            <TextInput
              value={data.subheading}
              onChange={(subheading) => update({ subheading })}
              placeholder="We'd love to hear from you"
              multiline
              rows={2}
            />
          </div>
          <AiGenerateButton
            type="website_body"
            context={{ sectionType: "marketing form / contact form", existingContent: data.subheading }}
            onSelect={(text) => update({ subheading: text })}
          />
        </div>
      </FormField>
    </div>
  );
}
