"use client";

import type { InstagramFeedSectionData } from "@/lib/website-sections/types";
import { FormField, TextInput } from "./FormField";

interface InstagramFeedFormProps {
  data: InstagramFeedSectionData;
  onChange: (data: InstagramFeedSectionData) => void;
}

export function InstagramFeedForm({ data, onChange }: InstagramFeedFormProps) {
  function update(partial: Partial<InstagramFeedSectionData>) {
    onChange({ ...data, ...partial });
  }

  return (
    <div>
      <FormField label="Heading">
        <TextInput value={data.heading} onChange={(heading) => update({ heading })} placeholder="Follow Us on Instagram" />
      </FormField>
      <FormField label="Instagram Handle" description="Without the @ symbol">
        <TextInput value={data.handle} onChange={(handle) => update({ handle })} placeholder="yourcoffeeroastery" />
      </FormField>
    </div>
  );
}
