"use client";

import type { TestimonialsSectionData, Testimonial } from "@/lib/website-sections/types";
import { FormField, TextInput, NumberInput, SelectInput } from "./FormField";
import { ArrayField } from "./ArrayField";
import { ImageUploadField } from "./ImageUploadField";

interface TestimonialsFormProps {
  data: TestimonialsSectionData;
  onChange: (data: TestimonialsSectionData) => void;
  roasterId: string;
}

export function TestimonialsForm({ data, onChange, roasterId }: TestimonialsFormProps) {
  function update(partial: Partial<TestimonialsSectionData>) {
    onChange({ ...data, ...partial });
  }

  return (
    <div>
      <FormField label="Heading">
        <TextInput
          value={data.heading}
          onChange={(heading) => update({ heading })}
          placeholder="What Our Customers Say"
        />
      </FormField>

      <FormField label="Layout">
        <SelectInput
          value={data.layout}
          onChange={(v) => update({ layout: v as "grid" | "carousel" })}
          options={[
            { value: "grid", label: "Grid" },
            { value: "carousel", label: "Carousel" },
          ]}
        />
      </FormField>

      <ArrayField<Testimonial>
        label="Testimonials"
        items={data.testimonials}
        onChange={(testimonials) => update({ testimonials })}
        createItem={() => ({ quote: "", author: "", role: "", rating: 5 })}
        itemLabel="testimonial"
        maxItems={9}
        renderItem={(item, _i, updateItem) => (
          <div className="space-y-2">
            <FormField label="Quote">
              <TextInput
                value={item.quote}
                onChange={(quote) => updateItem({ ...item, quote })}
                placeholder="Amazing coffee..."
                multiline
                rows={2}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Author">
                <TextInput
                  value={item.author}
                  onChange={(author) => updateItem({ ...item, author })}
                  placeholder="Sarah M."
                />
              </FormField>
              <FormField label="Role">
                <TextInput
                  value={item.role ?? ""}
                  onChange={(role) => updateItem({ ...item, role })}
                  placeholder="Customer"
                />
              </FormField>
            </div>
            <FormField label="Rating (1-5)">
              <NumberInput
                value={item.rating}
                onChange={(rating) => updateItem({ ...item, rating: Math.min(5, Math.max(1, rating)) })}
                min={1}
                max={5}
              />
            </FormField>
            <ImageUploadField
              label="Photo (optional)"
              value={item.image}
              onChange={(image) => updateItem({ ...item, image })}
              roasterId={roasterId}
            />
          </div>
        )}
      />
    </div>
  );
}
