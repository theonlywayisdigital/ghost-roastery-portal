"use client";

import type { AboutTeamSectionData, TeamMember } from "@/lib/website-sections/types";
import { FormField, TextInput } from "./FormField";
import { ArrayField } from "./ArrayField";
import { ImageUploadField } from "./ImageUploadField";

interface AboutTeamFormProps {
  data: AboutTeamSectionData;
  onChange: (data: AboutTeamSectionData) => void;
  roasterId: string;
}

export function AboutTeamForm({ data, onChange, roasterId }: AboutTeamFormProps) {
  function update(partial: Partial<AboutTeamSectionData>) {
    onChange({ ...data, ...partial });
  }

  return (
    <div>
      <FormField label="Heading">
        <TextInput value={data.heading} onChange={(heading) => update({ heading })} placeholder="Meet the Team" />
      </FormField>
      <FormField label="Subheading">
        <TextInput value={data.subheading} onChange={(subheading) => update({ subheading })} placeholder="The people behind the roast." />
      </FormField>

      <ArrayField<TeamMember>
        label="Team Members"
        items={data.members}
        onChange={(members) => update({ members })}
        createItem={() => ({ name: "", role: "", bio: "" })}
        itemLabel="member"
        maxItems={12}
        renderItem={(item, _i, updateItem) => (
          <div className="space-y-2">
            <FormField label="Name">
              <TextInput value={item.name} onChange={(name) => updateItem({ ...item, name })} placeholder="Name" />
            </FormField>
            <FormField label="Role">
              <TextInput value={item.role} onChange={(role) => updateItem({ ...item, role })} placeholder="Head Roaster" />
            </FormField>
            <FormField label="Bio">
              <TextInput value={item.bio ?? ""} onChange={(bio) => updateItem({ ...item, bio })} placeholder="Short bio..." multiline rows={2} />
            </FormField>
            <ImageUploadField label="Photo" value={item.image} onChange={(image) => updateItem({ ...item, image })} roasterId={roasterId} />
          </div>
        )}
      />
    </div>
  );
}
