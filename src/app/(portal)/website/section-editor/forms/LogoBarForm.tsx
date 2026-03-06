"use client";

import type { LogoBarSectionData, LogoItem } from "@/lib/website-sections/types";
import { FormField, TextInput, Toggle } from "./FormField";
import { ArrayField } from "./ArrayField";
import { ImageUploadField } from "./ImageUploadField";

interface LogoBarFormProps {
  data: LogoBarSectionData;
  onChange: (data: LogoBarSectionData) => void;
  roasterId: string;
}

export function LogoBarForm({ data, onChange, roasterId }: LogoBarFormProps) {
  function update(partial: Partial<LogoBarSectionData>) {
    onChange({ ...data, ...partial });
  }

  return (
    <div>
      <FormField label="Heading">
        <TextInput
          value={data.heading}
          onChange={(heading) => update({ heading })}
          placeholder="Trusted By"
        />
      </FormField>

      <Toggle
        checked={data.grayscale}
        onChange={(grayscale) => update({ grayscale })}
        label="Grayscale logos"
      />

      <ArrayField<LogoItem>
        label="Logos"
        items={data.logos}
        onChange={(logos) => update({ logos })}
        createItem={() => ({ url: "", alt: "" })}
        maxItems={12}
        itemLabel="Logo"
        renderItem={(item, _i, updateItem) => (
          <div className="space-y-2">
            <ImageUploadField
              value={item.url}
              onChange={(url) => updateItem({ ...item, url: url ?? "" })}
              roasterId={roasterId}
              label="Logo Image"
            />
            <FormField label="Alt Text">
              <TextInput
                value={item.alt}
                onChange={(alt) => updateItem({ ...item, alt })}
                placeholder="Company name"
              />
            </FormField>
            <FormField label="Link (optional)">
              <TextInput
                value={item.link ?? ""}
                onChange={(link) => updateItem({ ...item, link: link || undefined })}
                placeholder="https://..."
              />
            </FormField>
          </div>
        )}
      />
    </div>
  );
}
