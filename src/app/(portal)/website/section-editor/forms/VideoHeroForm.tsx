"use client";

import type { VideoHeroSectionData } from "@/lib/website-sections/types";
import { FormField, TextInput, Slider } from "./FormField";

interface VideoHeroFormProps {
  data: VideoHeroSectionData;
  onChange: (data: VideoHeroSectionData) => void;
}

export function VideoHeroForm({ data, onChange }: VideoHeroFormProps) {
  function update(partial: Partial<VideoHeroSectionData>) {
    onChange({ ...data, ...partial });
  }

  return (
    <div>
      <FormField label="Heading">
        <TextInput
          value={data.heading}
          onChange={(heading) => update({ heading })}
          placeholder="Watch Our Story"
        />
      </FormField>

      <FormField label="Subheading">
        <TextInput
          value={data.subheading}
          onChange={(subheading) => update({ subheading })}
          placeholder="From bean to cup..."
          multiline
          rows={2}
        />
      </FormField>

      <FormField label="Video URL" description="Direct link to an MP4 video file.">
        <TextInput
          value={data.videoUrl}
          onChange={(videoUrl) => update({ videoUrl })}
          placeholder="https://example.com/video.mp4"
        />
      </FormField>

      <FormField label={`Overlay Opacity (${Math.round(data.overlayOpacity * 100)}%)`}>
        <Slider
          value={data.overlayOpacity}
          onChange={(overlayOpacity) => update({ overlayOpacity })}
          min={0}
          max={1}
          step={0.05}
        />
      </FormField>

      <div className="border-t border-neutral-200 pt-4 mt-4">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Button (optional)</p>
        <FormField label="Text">
          <TextInput
            value={data.primaryButton?.text ?? ""}
            onChange={(text) =>
              update({
                primaryButton: text
                  ? { text, url: data.primaryButton?.url ?? "/shop" }
                  : undefined,
              })
            }
            placeholder="Shop Now"
          />
        </FormField>
        {data.primaryButton?.text && (
          <FormField label="URL">
            <TextInput
              value={data.primaryButton?.url ?? ""}
              onChange={(url) =>
                update({
                  primaryButton: { text: data.primaryButton!.text, url },
                })
              }
              placeholder="/shop"
            />
          </FormField>
        )}
      </div>
    </div>
  );
}
