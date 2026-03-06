"use client";

import type { ImageGallerySectionData, GalleryImage } from "@/lib/website-sections/types";
import { FormField, TextInput, SelectInput } from "./FormField";
import { ArrayField } from "./ArrayField";
import { ImageUploadField } from "./ImageUploadField";

interface ImageGalleryFormProps {
  data: ImageGallerySectionData;
  onChange: (data: ImageGallerySectionData) => void;
  roasterId: string;
}

export function ImageGalleryForm({ data, onChange, roasterId }: ImageGalleryFormProps) {
  function update(partial: Partial<ImageGallerySectionData>) {
    onChange({ ...data, ...partial });
  }

  return (
    <div>
      <FormField label="Heading">
        <TextInput value={data.heading} onChange={(heading) => update({ heading })} placeholder="Gallery" />
      </FormField>
      <FormField label="Columns">
        <SelectInput
          value={String(data.columns)}
          onChange={(v) => update({ columns: Number(v) as 2 | 3 | 4 })}
          options={[
            { value: "2", label: "2 Columns" },
            { value: "3", label: "3 Columns" },
            { value: "4", label: "4 Columns" },
          ]}
        />
      </FormField>

      <ArrayField<GalleryImage>
        label="Images"
        items={data.images}
        onChange={(images) => update({ images })}
        createItem={() => ({ url: "", alt: "" })}
        itemLabel="image"
        maxItems={20}
        renderItem={(item, _i, updateItem) => (
          <div className="space-y-2">
            <ImageUploadField
              label="Image"
              value={item.url || undefined}
              onChange={(url) => updateItem({ ...item, url: url ?? "" })}
              roasterId={roasterId}
            />
            <FormField label="Alt text">
              <TextInput value={item.alt} onChange={(alt) => updateItem({ ...item, alt })} placeholder="Describe the image" />
            </FormField>
          </div>
        )}
      />
    </div>
  );
}
