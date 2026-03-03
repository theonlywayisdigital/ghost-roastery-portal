"use client";

import { Trash2, Settings2 } from "lucide-react";
import type { EmailBlock } from "@/types/marketing";

interface PropertiesPanelProps {
  block: EmailBlock | null;
  onUpdate: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  emailBgColor: string;
  onEmailBgColorChange: (color: string) => void;
}

export function PropertiesPanel({ block, onUpdate, onDelete, emailBgColor, onEmailBgColorChange }: PropertiesPanelProps) {
  if (!block) {
    return (
      <div className="p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Email Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Background Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={emailBgColor || "#f8fafc"}
                onChange={(e) => onEmailBgColorChange(e.target.value)}
                className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={emailBgColor || "#f8fafc"}
                onChange={(e) => onEmailBgColorChange(e.target.value)}
                className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 font-mono"
              />
            </div>
            <div className="flex gap-1.5 mt-2">
              {["#f8fafc", "#ffffff", "#f1f5f9", "#fef2f2", "#fefce8", "#f0fdf4", "#eff6ff", "#1e293b"].map((c) => (
                <button
                  key={c}
                  onClick={() => onEmailBgColorChange(c)}
                  className={`w-6 h-6 rounded-md border transition-all ${
                    emailBgColor === c ? "border-brand-500 ring-1 ring-brand-300" : "border-slate-200 hover:border-slate-400"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>
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
  block: EmailBlock;
  onUpdate: (data: Record<string, unknown>) => void;
}) {
  switch (block.type) {
    case "header":
      return (
        <>
          <Field label="Text">
            <input
              type="text"
              value={block.data.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Level">
            <select
              value={block.data.level}
              onChange={(e) => onUpdate({ level: parseInt(e.target.value) })}
              className={SELECT_CLASS}
            >
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
            <input
              type="text"
              value={block.data.src}
              onChange={(e) => onUpdate({ src: e.target.value })}
              placeholder="https://..."
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Alt Text">
            <input
              type="text"
              value={block.data.alt}
              onChange={(e) => onUpdate({ alt: e.target.value })}
              placeholder="Describe the image"
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Link URL">
            <input
              type="text"
              value={block.data.linkUrl || ""}
              onChange={(e) => onUpdate({ linkUrl: e.target.value })}
              placeholder="https://..."
              className={INPUT_CLASS}
            />
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
              <input
                type="number"
                value={block.data.width}
                onChange={(e) => onUpdate({ width: parseInt(e.target.value) || 100 })}
                min={50}
                max={600}
                className={INPUT_CLASS}
              />
            </Field>
          )}
          <Field label="Border Radius">
            <input
              type="range"
              min={0}
              max={32}
              value={block.data.borderRadius ?? 8}
              onChange={(e) => onUpdate({ borderRadius: parseInt(e.target.value) })}
              className="w-full"
            />
            <span className="text-xs text-slate-400">{block.data.borderRadius ?? 8}px</span>
          </Field>
        </>
      );

    case "button":
      return (
        <>
          <Field label="Button Text">
            <input
              type="text"
              value={block.data.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="URL">
            <input
              type="text"
              value={block.data.url}
              onChange={(e) => onUpdate({ url: e.target.value })}
              placeholder="https://..."
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Style">
            <select
              value={block.data.style}
              onChange={(e) => onUpdate({ style: e.target.value })}
              className={SELECT_CLASS}
            >
              <option value="filled">Filled</option>
              <option value="outline">Outline</option>
            </select>
          </Field>
          <AlignField value={block.data.align} onChange={(align) => onUpdate({ align })} />
          <ColorField
            label="Background"
            value={block.data.backgroundColor || "#0083dc"}
            onChange={(backgroundColor) => onUpdate({ backgroundColor })}
          />
          <ColorField
            label="Text Color"
            value={block.data.textColor || "#ffffff"}
            onChange={(textColor) => onUpdate({ textColor })}
          />
          <Field label="Border Radius">
            <input
              type="range"
              min={0}
              max={32}
              value={block.data.borderRadius ?? 8}
              onChange={(e) => onUpdate({ borderRadius: parseInt(e.target.value) })}
              className="w-full"
            />
            <span className="text-xs text-slate-400">{block.data.borderRadius ?? 8}px</span>
          </Field>
        </>
      );

    case "divider":
      return (
        <>
          <ColorField
            label="Color"
            value={block.data.color || "#e2e8f0"}
            onChange={(color) => onUpdate({ color })}
          />
          <Field label="Thickness">
            <input
              type="range"
              min={1}
              max={6}
              value={block.data.thickness || 1}
              onChange={(e) => onUpdate({ thickness: parseInt(e.target.value) })}
              className="w-full"
            />
            <span className="text-xs text-slate-400">{block.data.thickness || 1}px</span>
          </Field>
          <Field label="Width">
            <select
              value={block.data.width || "full"}
              onChange={(e) => onUpdate({ width: e.target.value })}
              className={SELECT_CLASS}
            >
              <option value="full">Full</option>
              <option value="half">Half</option>
              <option value="third">Third</option>
            </select>
          </Field>
        </>
      );

    case "spacer":
      return (
        <Field label="Height">
          <input
            type="range"
            min={8}
            max={120}
            value={block.data.height || 32}
            onChange={(e) => onUpdate({ height: parseInt(e.target.value) })}
            className="w-full"
          />
          <span className="text-xs text-slate-400">{block.data.height || 32}px</span>
        </Field>
      );

    case "social":
      return (
        <>
          <Field label="Instagram URL">
            <input
              type="text"
              value={block.data.instagram || ""}
              onChange={(e) => onUpdate({ instagram: e.target.value })}
              placeholder="https://instagram.com/..."
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Facebook URL">
            <input
              type="text"
              value={block.data.facebook || ""}
              onChange={(e) => onUpdate({ facebook: e.target.value })}
              placeholder="https://facebook.com/..."
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="TikTok URL">
            <input
              type="text"
              value={block.data.tiktok || ""}
              onChange={(e) => onUpdate({ tiktok: e.target.value })}
              placeholder="https://tiktok.com/..."
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Website URL">
            <input
              type="text"
              value={block.data.website || ""}
              onChange={(e) => onUpdate({ website: e.target.value })}
              placeholder="https://..."
              className={INPUT_CLASS}
            />
          </Field>
          <AlignField value={block.data.align || "center"} onChange={(align) => onUpdate({ align })} />
        </>
      );

    case "footer":
      return (
        <>
          <Field label="Footer Text">
            <input
              type="text"
              value={block.data.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              className={INPUT_CLASS}
            />
          </Field>
          <AlignField value={block.data.align || "center"} onChange={(align) => onUpdate({ align })} />
        </>
      );

    case "product_grid":
      return (
        <>
          <Field label="Columns">
            <select
              value={block.data.columns}
              onChange={(e) => onUpdate({ columns: parseInt(e.target.value) })}
              className={SELECT_CLASS}
            >
              <option value={1}>1 Column</option>
              <option value={2}>2 Columns</option>
              <option value={3}>3 Columns</option>
            </select>
          </Field>
          <Field label="Products">
            <p className="text-xs text-slate-400">Product selection coming soon. Products will be pulled from your catalogue on send.</p>
          </Field>
        </>
      );

    case "discount_code":
      return (
        <>
          <Field label="Discount Code">
            <input
              type="text"
              value={block.data.code}
              onChange={(e) => onUpdate({ code: e.target.value.toUpperCase() })}
              placeholder="SUMMER20"
              className={`${INPUT_CLASS} font-mono uppercase`}
            />
          </Field>
          <Field label="Description">
            <input
              type="text"
              value={block.data.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Get 20% off your next order"
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Style">
            <select
              value={block.data.style}
              onChange={(e) => onUpdate({ style: e.target.value })}
              className={SELECT_CLASS}
            >
              <option value="card">Card</option>
              <option value="banner">Banner</option>
              <option value="minimal">Minimal</option>
            </select>
          </Field>
          <ColorField
            label="Background Color"
            value={block.data.backgroundColor || "#059669"}
            onChange={(backgroundColor) => onUpdate({ backgroundColor })}
          />
          <ColorField
            label="Text Color"
            value={block.data.textColor || "#ffffff"}
            onChange={(textColor) => onUpdate({ textColor })}
          />
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
