"use client";

import type { ContactFormSectionData } from "@/lib/website-sections/types";
import { FormField, TextInput, Toggle } from "./FormField";

interface ContactFormFormProps {
  data: ContactFormSectionData;
  onChange: (data: ContactFormSectionData) => void;
}

export function ContactFormForm({ data, onChange }: ContactFormFormProps) {
  function update(partial: Partial<ContactFormSectionData>) {
    onChange({ ...data, ...partial });
  }

  return (
    <div>
      <FormField label="Heading">
        <TextInput
          value={data.heading}
          onChange={(heading) => update({ heading })}
          placeholder="Get in Touch"
        />
      </FormField>

      <FormField label="Subheading">
        <TextInput
          value={data.subheading}
          onChange={(subheading) => update({ subheading })}
          placeholder="Have a question? We'd love to hear from you."
        />
      </FormField>

      <div className="border-t border-neutral-200 pt-4 mt-4">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Fields</p>
        <Toggle label="Name field" checked={data.showName} onChange={(showName) => update({ showName })} />
        <Toggle label="Email field" checked={data.showEmail} onChange={(showEmail) => update({ showEmail })} />
        <Toggle label="Phone field" checked={data.showPhone} onChange={(showPhone) => update({ showPhone })} />
        <Toggle label="Subject field" checked={data.showSubject} onChange={(showSubject) => update({ showSubject })} />
        <Toggle label="Message field" checked={data.showMessage} onChange={(showMessage) => update({ showMessage })} />
      </div>

      <FormField label="Submit Button Text">
        <TextInput
          value={data.submitText}
          onChange={(submitText) => update({ submitText })}
          placeholder="Send Message"
        />
      </FormField>

      <div className="border-t border-neutral-200 pt-4 mt-4">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Map</p>
        <Toggle label="Show Google Map" checked={data.showMap} onChange={(showMap) => update({ showMap })} />
        {data.showMap && (
          <FormField label="Map Address">
            <TextInput
              value={data.mapAddress ?? ""}
              onChange={(mapAddress) => update({ mapAddress })}
              placeholder="123 Coffee Lane, London"
            />
          </FormField>
        )}
      </div>
    </div>
  );
}
