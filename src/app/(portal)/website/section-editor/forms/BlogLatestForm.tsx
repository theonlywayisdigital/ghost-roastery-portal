"use client";

import type { BlogLatestSectionData } from "@/lib/website-sections/types";
import { FormField, TextInput, NumberInput } from "./FormField";

interface BlogLatestFormProps {
  data: BlogLatestSectionData;
  onChange: (data: BlogLatestSectionData) => void;
}

export function BlogLatestForm({ data, onChange }: BlogLatestFormProps) {
  function update(partial: Partial<BlogLatestSectionData>) {
    onChange({ ...data, ...partial });
  }

  return (
    <div>
      <FormField label="Heading">
        <TextInput value={data.heading} onChange={(heading) => update({ heading })} placeholder="From the Blog" />
      </FormField>
      <FormField label="Subheading">
        <TextInput value={data.subheading} onChange={(subheading) => update({ subheading })} placeholder="Stories and guides..." />
      </FormField>
      <FormField label="Max Posts" description="Number of posts to show (1-6)">
        <NumberInput value={data.maxPosts} onChange={(maxPosts) => update({ maxPosts: Math.min(6, Math.max(1, maxPosts)) })} min={1} max={6} />
      </FormField>
    </div>
  );
}
