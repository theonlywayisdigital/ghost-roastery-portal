"use client";

import type { EventsSectionData, EventItem } from "@/lib/website-sections/types";
import { FormField, TextInput, SelectInput } from "./FormField";
import { ArrayField } from "./ArrayField";
import { ImageUploadField } from "./ImageUploadField";

interface EventsFormProps {
  data: EventsSectionData;
  onChange: (data: EventsSectionData) => void;
  roasterId: string;
}

export function EventsForm({ data, onChange, roasterId }: EventsFormProps) {
  function update(partial: Partial<EventsSectionData>) {
    onChange({ ...data, ...partial });
  }

  return (
    <div>
      <FormField label="Heading">
        <TextInput value={data.heading} onChange={(heading) => update({ heading })} placeholder="Upcoming Events" />
      </FormField>

      <FormField label="Subheading">
        <TextInput value={data.subheading} onChange={(subheading) => update({ subheading })} placeholder="Join us for tastings and workshops" />
      </FormField>

      <FormField label="Layout">
        <SelectInput
          value={data.layout}
          onChange={(layout) => update({ layout: layout as "grid" | "list" })}
          options={[
            { value: "grid", label: "Grid" },
            { value: "list", label: "List" },
          ]}
        />
      </FormField>

      <ArrayField<EventItem>
        label="Events"
        items={data.events}
        onChange={(events) => update({ events })}
        createItem={() => ({ title: "", date: "", time: "", description: "" })}
        itemLabel="event"
        renderItem={(event, _i, updateItem) => (
          <div className="space-y-2">
            <TextInput value={event.title} onChange={(title) => updateItem({ ...event, title })} placeholder="Event title" />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={event.date}
                onChange={(e) => updateItem({ ...event, date: e.target.value })}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900"
              />
              <input
                type="time"
                value={event.time}
                onChange={(e) => updateItem({ ...event, time: e.target.value })}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900"
              />
            </div>
            <TextInput value={event.description} onChange={(description) => updateItem({ ...event, description })} placeholder="Description" />
            <TextInput value={event.link ?? ""} onChange={(link) => updateItem({ ...event, link: link || undefined })} placeholder="Link URL (optional)" />
            <ImageUploadField label="Image" value={event.image} onChange={(image) => updateItem({ ...event, image })} roasterId={roasterId} />
          </div>
        )}
      />
    </div>
  );
}
