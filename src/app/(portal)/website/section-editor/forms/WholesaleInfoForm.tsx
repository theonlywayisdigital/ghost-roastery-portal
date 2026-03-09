"use client";

import type { WholesaleInfoSectionData } from "@/lib/website-sections/types";
import { FormField, TextInput } from "./FormField";
import { RichTextField } from "./RichTextField";
import { ArrayField } from "./ArrayField";
import { AiGenerateButton } from "@/components/AiGenerateButton";

interface WholesaleInfoFormProps {
  data: WholesaleInfoSectionData;
  onChange: (data: WholesaleInfoSectionData) => void;
}

export function WholesaleInfoForm({ data, onChange }: WholesaleInfoFormProps) {
  function update(partial: Partial<WholesaleInfoSectionData>) {
    onChange({ ...data, ...partial });
  }

  return (
    <div>
      <FormField label="Heading">
        <div className="flex items-start gap-1">
          <div className="flex-1">
            <TextInput value={data.heading} onChange={(heading) => update({ heading })} placeholder="Wholesale Partners" />
          </div>
          <AiGenerateButton
            type="website_heading"
            context={{ sectionType: "wholesale info", existingContent: data.heading }}
            onSelect={(text) => update({ heading: text })}
          />
        </div>
      </FormField>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-neutral-700">Body</label>
          <AiGenerateButton
            type="website_body"
            context={{ sectionType: "wholesale info", existingContent: data.body }}
            onSelect={(text) => update({ body: text })}
          />
        </div>
        <RichTextField
          label=""
          value={data.body}
          onChange={(body) => update({ body })}
        />
      </div>

      <ArrayField<string>
        label="Features"
        items={data.features}
        onChange={(features) => update({ features })}
        createItem={() => ""}
        itemLabel="feature"
        maxItems={10}
        renderItem={(item, _i, updateItem) => (
          <FormField label="Feature">
            <TextInput value={item} onChange={(v) => updateItem(v)} placeholder="Competitive pricing" />
          </FormField>
        )}
      />

      <div className="border-t border-neutral-200 pt-4 mt-4">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Button</p>
        <FormField label="Text">
          <TextInput value={data.button.text} onChange={(text) => update({ button: { ...data.button, text } })} placeholder="Apply for Wholesale" />
        </FormField>
        <FormField label="URL">
          <TextInput value={data.button.url} onChange={(url) => update({ button: { ...data.button, url } })} placeholder="/wholesale" />
        </FormField>
      </div>
    </div>
  );
}
