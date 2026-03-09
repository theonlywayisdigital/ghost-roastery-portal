"use client";

import type { BrewingGuideSectionData, BrewingMethod, BrewingStep } from "@/lib/website-sections/types";
import { FormField, TextInput } from "./FormField";
import { ArrayField } from "./ArrayField";
import { AiGenerateButton } from "@/components/AiGenerateButton";

interface BrewingGuideFormProps {
  data: BrewingGuideSectionData;
  onChange: (data: BrewingGuideSectionData) => void;
}

export function BrewingGuideForm({ data, onChange }: BrewingGuideFormProps) {
  function update(partial: Partial<BrewingGuideSectionData>) {
    onChange({ ...data, ...partial });
  }

  return (
    <div>
      <FormField label="Heading">
        <div className="flex items-start gap-1">
          <div className="flex-1">
            <TextInput value={data.heading} onChange={(heading) => update({ heading })} placeholder="Brewing Guides" />
          </div>
          <AiGenerateButton
            type="website_heading"
            context={{ sectionType: "Brewing Guide", existingContent: data.heading }}
            onSelect={(text) => update({ heading: text })}
          />
        </div>
      </FormField>

      <FormField label="Subheading">
        <div className="flex items-start gap-1">
          <div className="flex-1">
            <TextInput value={data.subheading} onChange={(subheading) => update({ subheading })} placeholder="Master the perfect cup with our step-by-step guides" />
          </div>
          <AiGenerateButton
            type="website_body"
            context={{ sectionType: "Brewing Guide subheading", existingContent: data.subheading }}
            onSelect={(text) => update({ subheading: text })}
          />
        </div>
      </FormField>

      <ArrayField<BrewingMethod>
        label="Methods"
        items={data.methods}
        onChange={(methods) => update({ methods })}
        createItem={() => ({
          name: "",
          grind: "",
          ratio: "",
          steps: [{ title: "", description: "", duration: "" }],
        })}
        itemLabel="method"
        maxItems={10}
        renderItem={(method, _i, updateMethod) => (
          <div className="space-y-2">
            <FormField label="Name">
              <TextInput value={method.name} onChange={(name) => updateMethod({ ...method, name })} placeholder="e.g. Cafetière" />
            </FormField>
            <FormField label="Grind">
              <TextInput value={method.grind} onChange={(grind) => updateMethod({ ...method, grind })} placeholder="e.g. Coarse" />
            </FormField>
            <FormField label="Ratio">
              <TextInput value={method.ratio} onChange={(ratio) => updateMethod({ ...method, ratio })} placeholder="e.g. 15g / 250ml" />
            </FormField>

            <ArrayField<BrewingStep>
              label="Steps"
              items={method.steps}
              onChange={(steps) => updateMethod({ ...method, steps })}
              createItem={() => ({ title: "", description: "", duration: "" })}
              itemLabel="step"
              maxItems={12}
              renderItem={(step, _j, updateStep) => (
                <div className="space-y-2">
                  <FormField label="Title">
                    <TextInput value={step.title} onChange={(title) => updateStep({ ...step, title })} placeholder="e.g. Preheat" />
                  </FormField>
                  <FormField label="Description">
                    <TextInput value={step.description} onChange={(description) => updateStep({ ...step, description })} placeholder="Describe this step..." multiline rows={2} />
                  </FormField>
                  <FormField label="Duration (optional)">
                    <TextInput value={step.duration ?? ""} onChange={(duration) => updateStep({ ...step, duration: duration || undefined })} placeholder="e.g. 30s" />
                  </FormField>
                </div>
              )}
            />
          </div>
        )}
      />
    </div>
  );
}
