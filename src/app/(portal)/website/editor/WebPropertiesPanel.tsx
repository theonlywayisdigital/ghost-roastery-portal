"use client";

import { Trash2, Settings2 } from "@/components/icons";
import type { WebBlock } from "./web-block-types";

interface WebPropertiesPanelProps {
  block: WebBlock | null;
  onUpdate: (data: Record<string, unknown>) => void;
  onDelete: () => void;
}

export function WebPropertiesPanel({ block, onUpdate, onDelete }: WebPropertiesPanelProps) {
  if (!block) {
    return (
      <div className="p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Page Settings</h3>
        <div className="mt-8 pt-4 border-t border-slate-100 text-center">
          <Settings2 className="w-6 h-6 text-slate-200 mx-auto mb-2" />
          <p className="text-xs text-slate-400">Select a block to edit its properties</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 capitalize">
          {block.type.replace("_", " ")}
        </h3>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
          title="Delete block"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        <BlockProperties block={block} onUpdate={onUpdate} />
      </div>
    </div>
  );
}

function BlockProperties({
  block,
  onUpdate,
}: {
  block: WebBlock;
  onUpdate: (data: Record<string, unknown>) => void;
}) {
  switch (block.type) {
    case "hero":
      return (
        <>
          <Field label="Heading">
            <input type="text" value={block.data.heading} onChange={(e) => onUpdate({ heading: e.target.value })} className={INPUT_CLASS} />
          </Field>
          <Field label="Subheading">
            <input type="text" value={block.data.subheading} onChange={(e) => onUpdate({ subheading: e.target.value })} className={INPUT_CLASS} />
          </Field>
          <Field label="Button Text">
            <input type="text" value={block.data.buttonText} onChange={(e) => onUpdate({ buttonText: e.target.value })} className={INPUT_CLASS} />
          </Field>
          <Field label="Button URL">
            <input type="text" value={block.data.buttonUrl} onChange={(e) => onUpdate({ buttonUrl: e.target.value })} placeholder="https://..." className={INPUT_CLASS} />
          </Field>
          <Field label="Background Image URL">
            <input type="text" value={block.data.backgroundImageUrl} onChange={(e) => onUpdate({ backgroundImageUrl: e.target.value })} placeholder="https://..." className={INPUT_CLASS} />
          </Field>
          <Field label="Overlay Opacity">
            <input type="range" min={0} max={100} value={block.data.backgroundOverlay || 40} onChange={(e) => onUpdate({ backgroundOverlay: parseInt(e.target.value) })} className="w-full" />
            <span className="text-xs text-slate-400">{`${block.data.backgroundOverlay || 40}%`}</span>
          </Field>
          <Field label="Min Height">
            <input type="range" min={200} max={800} value={block.data.minHeight || 400} onChange={(e) => onUpdate({ minHeight: parseInt(e.target.value) })} className="w-full" />
            <span className="text-xs text-slate-400">{`${block.data.minHeight || 400}px`}</span>
          </Field>
          <AlignField value={block.data.align} onChange={(align) => onUpdate({ align })} />
        </>
      );

    case "heading":
      return (
        <>
          <Field label="Text">
            <input type="text" value={block.data.text} onChange={(e) => onUpdate({ text: e.target.value })} className={INPUT_CLASS} />
          </Field>
          <Field label="Level">
            <select value={block.data.level} onChange={(e) => onUpdate({ level: parseInt(e.target.value) })} className={SELECT_CLASS}>
              <option value={1}>H1 — Large</option>
              <option value={2}>H2 — Medium</option>
              <option value={3}>H3 — Small</option>
            </select>
          </Field>
          <AlignField value={block.data.align} onChange={(align) => onUpdate({ align })} />
          <ColorField label="Color" value={block.data.color || "#0f172a"} onChange={(color) => onUpdate({ color })} />
        </>
      );

    case "text":
      return (
        <>
          <Field label="Content">
            <p className="text-xs text-slate-400">Edit text directly on the canvas. Use the toolbar for formatting.</p>
          </Field>
          <AlignField value={block.data.align || "left"} onChange={(align) => onUpdate({ align })} />
        </>
      );

    case "image":
      return (
        <>
          <Field label="Image URL">
            <input type="text" value={block.data.src} onChange={(e) => onUpdate({ src: e.target.value })} placeholder="https://..." className={INPUT_CLASS} />
          </Field>
          <Field label="Alt Text">
            <input type="text" value={block.data.alt} onChange={(e) => onUpdate({ alt: e.target.value })} placeholder="Describe the image" className={INPUT_CLASS} />
          </Field>
          <Field label="Caption">
            <input type="text" value={block.data.caption || ""} onChange={(e) => onUpdate({ caption: e.target.value })} placeholder="Optional caption" className={INPUT_CLASS} />
          </Field>
          <Field label="Link URL">
            <input type="text" value={block.data.linkUrl || ""} onChange={(e) => onUpdate({ linkUrl: e.target.value })} placeholder="https://..." className={INPUT_CLASS} />
          </Field>
          <AlignField value={block.data.align} onChange={(align) => onUpdate({ align })} />
          <Field label="Width">
            <select
              value={typeof block.data.width === "number" ? "custom" : block.data.width || "auto"}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "custom") onUpdate({ width: 400 });
                else onUpdate({ width: v });
              }}
              className={SELECT_CLASS}
            >
              <option value="auto">Auto</option>
              <option value="full">Full width</option>
              <option value="custom">Custom</option>
            </select>
          </Field>
          {typeof block.data.width === "number" && (
            <Field label="Width (px)">
              <input type="number" value={block.data.width} onChange={(e) => onUpdate({ width: parseInt(e.target.value) || 100 })} min={50} max={1200} className={INPUT_CLASS} />
            </Field>
          )}
          <Field label="Border Radius">
            <input type="range" min={0} max={32} value={block.data.borderRadius ?? 8} onChange={(e) => onUpdate({ borderRadius: parseInt(e.target.value) })} className="w-full" />
            <span className="text-xs text-slate-400">{`${block.data.borderRadius ?? 8}px`}</span>
          </Field>
        </>
      );

    case "button":
      return (
        <>
          <Field label="Button Text">
            <input type="text" value={block.data.text} onChange={(e) => onUpdate({ text: e.target.value })} className={INPUT_CLASS} />
          </Field>
          <Field label="URL">
            <input type="text" value={block.data.url} onChange={(e) => onUpdate({ url: e.target.value })} placeholder="https://..." className={INPUT_CLASS} />
          </Field>
          <Field label="Style">
            <select value={block.data.style} onChange={(e) => onUpdate({ style: e.target.value })} className={SELECT_CLASS}>
              <option value="filled">Filled</option>
              <option value="outline">Outline</option>
            </select>
          </Field>
          <Field label="Size">
            <select value={block.data.size} onChange={(e) => onUpdate({ size: e.target.value })} className={SELECT_CLASS}>
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </Field>
          <AlignField value={block.data.align} onChange={(align) => onUpdate({ align })} />
          <ColorField label="Background" value={block.data.backgroundColor || "#0083dc"} onChange={(backgroundColor) => onUpdate({ backgroundColor })} />
          <ColorField label="Text Color" value={block.data.textColor || "#ffffff"} onChange={(textColor) => onUpdate({ textColor })} />
          <Field label="Border Radius">
            <input type="range" min={0} max={32} value={block.data.borderRadius ?? 8} onChange={(e) => onUpdate({ borderRadius: parseInt(e.target.value) })} className="w-full" />
            <span className="text-xs text-slate-400">{`${block.data.borderRadius ?? 8}px`}</span>
          </Field>
        </>
      );

    case "two_column":
      return (
        <>
          <Field label="Column Split">
            <select value={block.data.split} onChange={(e) => onUpdate({ split: e.target.value })} className={SELECT_CLASS}>
              <option value="50-50">50 / 50</option>
              <option value="33-67">33 / 67</option>
              <option value="67-33">67 / 33</option>
            </select>
          </Field>
          <Field label="Gap">
            <input type="range" min={0} max={64} value={block.data.gap || 24} onChange={(e) => onUpdate({ gap: parseInt(e.target.value) })} className="w-full" />
            <span className="text-xs text-slate-400">{`${block.data.gap || 24}px`}</span>
          </Field>
          <Field label="Left Column">
            <p className="text-xs text-slate-400">Content editing coming in a future update.</p>
          </Field>
          <Field label="Right Column">
            <p className="text-xs text-slate-400">Content editing coming in a future update.</p>
          </Field>
        </>
      );

    case "product_grid":
      return (
        <>
          <Field label="Columns">
            <select value={block.data.columns} onChange={(e) => onUpdate({ columns: parseInt(e.target.value) })} className={SELECT_CLASS}>
              <option value={2}>2 Columns</option>
              <option value={3}>3 Columns</option>
              <option value={4}>4 Columns</option>
            </select>
          </Field>
          <Field label="Max Products">
            <input type="number" value={block.data.limit} onChange={(e) => onUpdate({ limit: parseInt(e.target.value) || 6 })} min={1} max={20} className={INPUT_CLASS} />
          </Field>
          <Field label="Display Options">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={block.data.showPrice} onChange={(e) => onUpdate({ showPrice: e.target.checked })} className="rounded border-slate-300" />
              Show Price
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 mt-1.5">
              <input type="checkbox" checked={block.data.showButton} onChange={(e) => onUpdate({ showButton: e.target.checked })} className="rounded border-slate-300" />
              Show Add to Cart
            </label>
          </Field>
        </>
      );

    case "contact_form":
      return (
        <>
          <Field label="Heading">
            <input type="text" value={block.data.heading} onChange={(e) => onUpdate({ heading: e.target.value })} className={INPUT_CLASS} />
          </Field>
          <Field label="Submit Button Text">
            <input type="text" value={block.data.submitText} onChange={(e) => onUpdate({ submitText: e.target.value })} className={INPUT_CLASS} />
          </Field>
          <Field label="Success Message">
            <input type="text" value={block.data.successMessage} onChange={(e) => onUpdate({ successMessage: e.target.value })} className={INPUT_CLASS} />
          </Field>
          <Field label="Fields">
            {(["name", "email", "phone", "message"] as const).map((f) => (
              <label key={f} className="flex items-center gap-2 text-sm text-slate-700 mt-1">
                <input
                  type="checkbox"
                  checked={block.data.fields.includes(f)}
                  onChange={(e) => {
                    const fields = e.target.checked
                      ? [...block.data.fields, f]
                      : block.data.fields.filter((x) => x !== f);
                    onUpdate({ fields });
                  }}
                  className="rounded border-slate-300"
                />
                <span className="capitalize">{f}</span>
              </label>
            ))}
          </Field>
        </>
      );

    case "spacer":
      return (
        <Field label="Height">
          <input type="range" min={8} max={200} value={block.data.height || 48} onChange={(e) => onUpdate({ height: parseInt(e.target.value) })} className="w-full" />
          <span className="text-xs text-slate-400">{`${block.data.height || 48}px`}</span>
        </Field>
      );

    case "divider":
      return (
        <>
          <ColorField label="Color" value={block.data.color || "#e2e8f0"} onChange={(color) => onUpdate({ color })} />
          <Field label="Thickness">
            <input type="range" min={1} max={6} value={block.data.thickness || 1} onChange={(e) => onUpdate({ thickness: parseInt(e.target.value) })} className="w-full" />
            <span className="text-xs text-slate-400">{`${block.data.thickness || 1}px`}</span>
          </Field>
          <Field label="Width">
            <select value={block.data.width || "full"} onChange={(e) => onUpdate({ width: e.target.value })} className={SELECT_CLASS}>
              <option value="full">Full</option>
              <option value="half">Half</option>
              <option value="third">Third</option>
            </select>
          </Field>
        </>
      );

    case "testimonial":
      return (
        <>
          <Field label="Quote">
            <textarea value={block.data.quote} onChange={(e) => onUpdate({ quote: e.target.value })} rows={3} className={INPUT_CLASS} />
          </Field>
          <Field label="Author">
            <input type="text" value={block.data.author} onChange={(e) => onUpdate({ author: e.target.value })} className={INPUT_CLASS} />
          </Field>
          <Field label="Role / Company">
            <input type="text" value={block.data.role || ""} onChange={(e) => onUpdate({ role: e.target.value })} placeholder="CEO, Coffee Co." className={INPUT_CLASS} />
          </Field>
          <Field label="Photo URL">
            <input type="text" value={block.data.imageUrl || ""} onChange={(e) => onUpdate({ imageUrl: e.target.value })} placeholder="https://..." className={INPUT_CLASS} />
          </Field>
          <AlignField value={block.data.align || "center"} onChange={(align) => onUpdate({ align })} />
        </>
      );

    case "gallery":
      return (
        <>
          <Field label="Columns">
            <select value={block.data.columns} onChange={(e) => onUpdate({ columns: parseInt(e.target.value) })} className={SELECT_CLASS}>
              <option value={2}>2 Columns</option>
              <option value={3}>3 Columns</option>
              <option value={4}>4 Columns</option>
            </select>
          </Field>
          <Field label="Gap">
            <input type="range" min={0} max={24} value={block.data.gap} onChange={(e) => onUpdate({ gap: parseInt(e.target.value) })} className="w-full" />
            <span className="text-xs text-slate-400">{`${block.data.gap}px`}</span>
          </Field>
          <Field label="Border Radius">
            <input type="range" min={0} max={32} value={block.data.borderRadius} onChange={(e) => onUpdate({ borderRadius: parseInt(e.target.value) })} className="w-full" />
            <span className="text-xs text-slate-400">{`${block.data.borderRadius}px`}</span>
          </Field>
          <Field label="Images">
            <p className="text-xs text-slate-400">Image management coming in a future update. Use the API to add images programmatically.</p>
          </Field>
        </>
      );

    case "video":
      return (
        <>
          <Field label="Video URL">
            <input type="text" value={block.data.url} onChange={(e) => onUpdate({ url: e.target.value })} placeholder="YouTube or Vimeo URL" className={INPUT_CLASS} />
          </Field>
          <Field label="Aspect Ratio">
            <select value={block.data.aspectRatio} onChange={(e) => onUpdate({ aspectRatio: e.target.value })} className={SELECT_CLASS}>
              <option value="16:9">16:9 (Widescreen)</option>
              <option value="4:3">4:3 (Standard)</option>
              <option value="1:1">1:1 (Square)</option>
            </select>
          </Field>
        </>
      );

    case "map":
      return (
        <>
          <Field label="Address">
            <input type="text" value={block.data.address} onChange={(e) => onUpdate({ address: e.target.value })} placeholder="123 Coffee Street, London" className={INPUT_CLASS} />
          </Field>
          <Field label="Height">
            <input type="range" min={150} max={600} value={block.data.height || 300} onChange={(e) => onUpdate({ height: parseInt(e.target.value) })} className="w-full" />
            <span className="text-xs text-slate-400">{`${block.data.height || 300}px`}</span>
          </Field>
          <Field label="Zoom">
            <input type="range" min={1} max={20} value={block.data.zoom || 14} onChange={(e) => onUpdate({ zoom: parseInt(e.target.value) })} className="w-full" />
            <span className="text-xs text-slate-400">{block.data.zoom || 14}</span>
          </Field>
        </>
      );

    default:
      return <p className="text-xs text-slate-400">No properties available.</p>;
  }
}

// ─── Shared field components ───

const INPUT_CLASS =
  "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white";
const SELECT_CLASS =
  "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function AlignField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label="Alignment">
      <div className="flex gap-1">
        {(["left", "center", "right"] as const).map((align) => (
          <button
            key={align}
            onClick={() => onChange(align)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              value === align
                ? "bg-brand-50 text-brand-700 border border-brand-200"
                : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            {align.charAt(0).toUpperCase() + align.slice(1)}
          </button>
        ))}
      </div>
    </Field>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 font-mono"
        />
      </div>
    </Field>
  );
}
