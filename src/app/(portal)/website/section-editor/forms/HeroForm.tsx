"use client";

import type { HeroSectionData } from "@/lib/website-sections/types";
import { FormField, TextInput, Slider } from "./FormField";
import { ImageUploadField } from "./ImageUploadField";

interface HeroFormProps {
  data: HeroSectionData;
  onChange: (data: HeroSectionData) => void;
  roasterId: string;
}

export function HeroForm({ data, onChange, roasterId }: HeroFormProps) {
  function update(partial: Partial<HeroSectionData>) {
    onChange({ ...data, ...partial });
  }

  return (
    <div>
      <FormField label="Heading">
        <TextInput
          value={data.heading}
          onChange={(heading) => update({ heading })}
          placeholder="Welcome to Our Roastery"
        />
      </FormField>

      <FormField label="Subheading">
        <TextInput
          value={data.subheading}
          onChange={(subheading) => update({ subheading })}
          placeholder="Specialty coffee, roasted with care..."
          multiline
          rows={2}
        />
      </FormField>

      <ImageUploadField
        label="Background Image"
        value={data.backgroundImage}
        onChange={(backgroundImage) => update({ backgroundImage })}
        roasterId={roasterId}
      />

      <FormField label={`Overlay Opacity: ${Math.round(data.overlayOpacity * 100)}%`}>
        <Slider
          value={data.overlayOpacity}
          onChange={(overlayOpacity) => update({ overlayOpacity })}
          min={0}
          max={1}
          step={0.05}
        />
      </FormField>

      <div className="border-t border-neutral-200 pt-4 mt-4">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Primary Button</p>
        <FormField label="Text">
          <TextInput
            value={data.primaryButton?.text ?? ""}
            onChange={(text) =>
              update({ primaryButton: { url: data.primaryButton?.url ?? "/shop", text } })
            }
            placeholder="Shop Now"
          />
        </FormField>
        <FormField label="URL">
          <TextInput
            value={data.primaryButton?.url ?? ""}
            onChange={(url) =>
              update({ primaryButton: { text: data.primaryButton?.text ?? "Shop Now", url } })
            }
            placeholder="/shop"
          />
        </FormField>
      </div>

      <div className="border-t border-neutral-200 pt-4 mt-4">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Secondary Button</p>
        <FormField label="Text">
          <TextInput
            value={data.secondaryButton?.text ?? ""}
            onChange={(text) =>
              update({ secondaryButton: { url: data.secondaryButton?.url ?? "/about", text } })
            }
            placeholder="Our Story"
          />
        </FormField>
        <FormField label="URL">
          <TextInput
            value={data.secondaryButton?.url ?? ""}
            onChange={(url) =>
              update({ secondaryButton: { text: data.secondaryButton?.text ?? "Our Story", url } })
            }
            placeholder="/about"
          />
        </FormField>
      </div>
    </div>
  );
}
