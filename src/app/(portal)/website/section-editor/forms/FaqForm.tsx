"use client";

import type { FaqSectionData, FaqItem } from "@/lib/website-sections/types";
import { FormField, TextInput } from "./FormField";
import { ArrayField } from "./ArrayField";

interface FaqFormProps {
  data: FaqSectionData;
  onChange: (data: FaqSectionData) => void;
}

export function FaqForm({ data, onChange }: FaqFormProps) {
  function update(partial: Partial<FaqSectionData>) {
    onChange({ ...data, ...partial });
  }

  return (
    <div>
      <FormField label="Heading">
        <TextInput value={data.heading} onChange={(heading) => update({ heading })} placeholder="Frequently Asked Questions" />
      </FormField>
      <FormField label="Subheading">
        <TextInput value={data.subheading} onChange={(subheading) => update({ subheading })} placeholder="Everything you need to know..." />
      </FormField>

      <ArrayField<FaqItem>
        label="Questions"
        items={data.items}
        onChange={(items) => update({ items })}
        createItem={() => ({ question: "", answer: "" })}
        itemLabel="question"
        maxItems={20}
        renderItem={(item, _i, updateItem) => (
          <div className="space-y-2">
            <FormField label="Question">
              <TextInput value={item.question} onChange={(question) => updateItem({ ...item, question })} placeholder="How fresh is your coffee?" />
            </FormField>
            <FormField label="Answer">
              <TextInput value={item.answer} onChange={(answer) => updateItem({ ...item, answer })} placeholder="We roast to order..." multiline rows={3} />
            </FormField>
          </div>
        )}
      />
    </div>
  );
}
