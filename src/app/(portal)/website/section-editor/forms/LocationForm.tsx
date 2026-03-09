"use client";

import type { LocationSectionData } from "@/lib/website-sections/types";
import { FormField, TextInput, SelectInput, Toggle } from "./FormField";
import { ImageUploadField } from "./ImageUploadField";
import { ArrayField } from "./ArrayField";

interface LocationFormProps {
  data: LocationSectionData;
  onChange: (data: LocationSectionData) => void;
  roasterId: string;
}

export function LocationForm({ data, onChange, roasterId }: LocationFormProps) {
  function update(partial: Partial<LocationSectionData>) {
    onChange({ ...data, ...partial });
  }

  return (
    <div>
      <FormField label="Heading">
        <TextInput value={data.heading} onChange={(heading) => update({ heading })} placeholder="Visit Us" />
      </FormField>

      <FormField label="Description">
        <TextInput value={data.body} onChange={(body) => update({ body })} placeholder="Tell visitors about your caf\u00e9..." multiline rows={4} />
      </FormField>

      <FormField label="Address">
        <TextInput value={data.address} onChange={(address) => update({ address })} placeholder="123 Coffee Lane, London" />
      </FormField>

      <ImageUploadField
        label="Photo"
        value={data.image}
        onChange={(image) => update({ image })}
        roasterId={roasterId}
      />

      <FormField label="Image Position">
        <SelectInput
          value={data.imagePosition}
          onChange={(pos) => update({ imagePosition: pos as "left" | "right" })}
          options={[
            { value: "left", label: "Left" },
            { value: "right", label: "Right" },
          ]}
        />
      </FormField>

      <Toggle label="Show Google Map" checked={data.showMap} onChange={(showMap) => update({ showMap })} />

      <div className="border-t border-neutral-200 pt-4 mt-4">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Contact Details</p>
        <FormField label="Phone">
          <TextInput value={data.phone ?? ""} onChange={(phone) => update({ phone: phone || undefined })} placeholder="+44 20 1234 5678" />
        </FormField>
        <FormField label="Email">
          <TextInput value={data.email ?? ""} onChange={(email) => update({ email: email || undefined })} placeholder="hello@roastery.com" />
        </FormField>
      </div>

      <ArrayField<{ day: string; hours: string }>
        label="Opening Hours"
        items={data.openingHours}
        onChange={(openingHours) => update({ openingHours })}
        createItem={() => ({ day: "", hours: "" })}
        itemLabel="slot"
        renderItem={(slot, _i, updateItem) => (
          <div className="grid grid-cols-2 gap-2">
            <TextInput value={slot.day} onChange={(day) => updateItem({ ...slot, day })} placeholder="Monday - Friday" />
            <TextInput value={slot.hours} onChange={(hours) => updateItem({ ...slot, hours })} placeholder="7:00 AM - 6:00 PM" />
          </div>
        )}
      />
    </div>
  );
}
