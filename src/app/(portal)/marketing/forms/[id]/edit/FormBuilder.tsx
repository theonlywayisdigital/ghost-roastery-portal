"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMarketingContext } from "@/lib/marketing-context";
import {
  ArrowLeft,
  Loader2,
  Save,
  Eye,
  Play,
  Pause,
  Plus,
  Trash2,
  GripVertical,
  Type,
  Mail,
  Phone,
  AlignLeft,
  List,
  CheckSquare,
  Circle,
  Hash,
  Calendar,
  EyeOff,
  X,
  Code,
  Link2,
  Copy,
} from "@/components/icons";
import { AiGenerateButton } from "@/components/AiGenerateButton";

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: Record<string, unknown>;
  width: string;
  order: number;
}

interface FormData {
  id: string;
  name: string;
  description: string | null;
  form_type: string;
  fields: FormField[];
  settings: Record<string, unknown>;
  branding: Record<string, unknown>;
  status: string;
}

const FIELD_TYPES = [
  { type: "text", label: "Text", icon: Type },
  { type: "email", label: "Email", icon: Mail },
  { type: "phone", label: "Phone", icon: Phone },
  { type: "textarea", label: "Textarea", icon: AlignLeft },
  { type: "select", label: "Dropdown", icon: List },
  { type: "checkbox", label: "Checkboxes", icon: CheckSquare },
  { type: "radio", label: "Radio", icon: Circle },
  { type: "number", label: "Number", icon: Hash },
  { type: "date", label: "Date", icon: Calendar },
  { type: "hidden", label: "Hidden", icon: EyeOff },
];

type Tab = "fields" | "branding";

export function FormBuilder({ formId }: { formId: string }) {
  const router = useRouter();
  const { apiBase, pageBase } = useMarketingContext();
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("fields");
  const [showPreview, setShowPreview] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const loadForm = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/forms/${formId}`);
      if (res.ok) {
        const data = await res.json();
        setForm(data.form);
      }
    } catch {
      // silent
    }
    setLoading(false);
  }, [formId]);

  useEffect(() => {
    loadForm();
  }, [loadForm]);

  const saveForm = useCallback(
    async (updates: Partial<FormData>) => {
      setSaving(true);
      try {
        await fetch(`${apiBase}/forms/${formId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
      } catch {
        // silent
      }
      setSaving(false);
    },
    [formId]
  );

  function debouncedSave(updates: Partial<FormData>) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveForm(updates), 800);
  }

  function updateField(fieldId: string, changes: Partial<FormField>) {
    if (!form) return;
    const fields = form.fields.map((f) =>
      f.id === fieldId ? { ...f, ...changes } : f
    );
    setForm({ ...form, fields });
    debouncedSave({ fields });
  }

  function addField(type: string) {
    if (!form) return;
    const id = `field_${Date.now()}`;
    const newField: FormField = {
      id,
      type,
      label: FIELD_TYPES.find((t) => t.type === type)?.label || "Field",
      placeholder: "",
      required: false,
      width: "full",
      order: form.fields.length + 1,
      ...(["select", "checkbox", "radio"].includes(type) ? { options: ["Option 1", "Option 2"] } : {}),
    };
    const fields = [...form.fields, newField];
    setForm({ ...form, fields });
    setSelectedField(id);
    debouncedSave({ fields });
  }

  function removeField(fieldId: string) {
    if (!form) return;
    const fields = form.fields
      .filter((f) => f.id !== fieldId)
      .map((f, i) => ({ ...f, order: i + 1 }));
    setForm({ ...form, fields });
    if (selectedField === fieldId) setSelectedField(null);
    debouncedSave({ fields });
  }

  function moveField(fromIdx: number, toIdx: number) {
    if (!form || fromIdx === toIdx) return;
    const fields = [...form.fields];
    const [moved] = fields.splice(fromIdx, 1);
    fields.splice(toIdx, 0, moved);
    const reordered = fields.map((f, i) => ({ ...f, order: i + 1 }));
    setForm({ ...form, fields: reordered });
    debouncedSave({ fields: reordered });
  }

  function updateSettings(changes: Record<string, unknown>) {
    if (!form) return;
    const settings = { ...form.settings, ...changes };
    setForm({ ...form, settings });
    debouncedSave({ settings });
  }

  function updateBranding(changes: Record<string, unknown>) {
    if (!form) return;
    const branding = { ...form.branding, ...changes };
    setForm({ ...form, branding });
    debouncedSave({ branding });
  }

  async function toggleStatus() {
    if (!form) return;
    const newStatus = form.status === "active" ? "draft" : "active";
    setForm({ ...form, status: newStatus });
    await saveForm({ status: newStatus });
  }

  if (loading || !form) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  const selectedFieldData = form.fields.find((f) => f.id === selectedField);
  const portalUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="min-h-[calc(100vh-140px)] -m-6 lg:-m-8">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`${pageBase}/forms`)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <input
            value={form.name}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value });
              debouncedSave({ name: e.target.value });
            }}
            className="text-lg font-bold text-slate-900 border-none outline-none bg-transparent min-w-[200px]"
          />
          {saving && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEmbed(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <Code className="w-4 h-4" />
            Embed
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            onClick={toggleStatus}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              form.status === "active"
                ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {form.status === "active" ? (
              <><Pause className="w-3.5 h-3.5" />Deactivate</>
            ) : (
              <><Play className="w-3.5 h-3.5" />Activate</>
            )}
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex h-[calc(100vh-200px)]">
        {/* Left: Form canvas */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-100">
          <div
            className="max-w-lg mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6"
            style={{
              backgroundColor: (form.branding.background_colour as string) || "#ffffff",
              color: (form.branding.text_colour as string) || "#1e293b",
              fontFamily: (form.branding.font_family as string) || "system-ui",
              borderRadius: `${(form.branding.border_radius as number) || 8}px`,
            }}
          >
            {/* Logo */}
            {Boolean(form.branding.logo_url) && (
              <div className="mb-4">
                <img
                  src={form.branding.logo_url as string}
                  alt="Logo"
                  className="h-10 object-contain"
                />
              </div>
            )}

            {/* Form title */}
            <input
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                debouncedSave({ name: e.target.value });
              }}
              className="text-xl font-bold mb-1 border-none outline-none bg-transparent w-full"
              style={{ color: (form.branding.text_colour as string) || "#1e293b" }}
            />
            <div className="flex items-center gap-1 mb-6">
              <input
                value={form.description || ""}
                onChange={(e) => {
                  setForm({ ...form, description: e.target.value || null });
                  debouncedSave({ description: e.target.value || null });
                }}
                placeholder="Form description (optional)"
                className="text-sm border-none outline-none bg-transparent flex-1 text-slate-500"
              />
              <AiGenerateButton
                type="form_description"
                context={{ existingContent: form.description || "" }}
                onSelect={(v) => {
                  setForm({ ...form, description: v });
                  debouncedSave({ description: v });
                }}
              />
            </div>

            {/* Fields */}
            <div className="space-y-4">
              {form.fields.map((field, idx) => {
                const isSelected = selectedField === field.id;
                return (
                  <div
                    key={field.id}
                    className={`relative group rounded-lg p-3 -mx-3 transition-all cursor-pointer ${
                      isSelected
                        ? "ring-2 ring-brand-500 bg-brand-50/30"
                        : "hover:bg-slate-50"
                    } ${draggedIdx === idx ? "opacity-50" : ""}`}
                    onClick={() => setSelectedField(field.id)}
                    draggable
                    onDragStart={() => setDraggedIdx(idx)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggedIdx !== null && draggedIdx !== idx) {
                        moveField(draggedIdx, idx);
                        setDraggedIdx(idx);
                      }
                    }}
                    onDragEnd={() => setDraggedIdx(null)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="text-slate-300 cursor-grab mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-0.5">*</span>}
                        </label>
                        <FieldPreview field={field} branding={form.branding} />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeField(field.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add field button */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex flex-wrap gap-1.5">
                {FIELD_TYPES.filter((t) => t.type !== "hidden").map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.type}
                      onClick={() => addField(t.type)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-500 border border-slate-200 rounded hover:bg-slate-50 hover:text-slate-700 transition-colors"
                    >
                      <Icon className="w-3 h-3" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GDPR consent */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" disabled checked className="mt-1 rounded" />
                <span className="text-slate-600 text-xs">
                  {(form.settings.gdpr_consent_text as string) || "I agree to receive communications."}
                </span>
              </label>
            </div>

            {/* Submit button */}
            <button
              className="w-full mt-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: (form.branding.button_colour as string) || "#2563eb",
                color: (form.branding.button_text_colour as string) || "#ffffff",
                borderRadius: `${(form.branding.border_radius as number) || 8}px`,
              }}
              disabled
            >
              Submit
            </button>

            {/* Powered by */}
            {form.branding.show_powered_by !== false && (
              <p className="text-center text-[10px] text-slate-400 mt-4">
                Powered by Roastery Platform
              </p>
            )}
          </div>
        </div>

        {/* Right: Properties panel */}
        <div className="w-80 bg-white border-l border-slate-200 overflow-y-auto flex-shrink-0">
          {/* Tab switcher */}
          <div className="flex border-b border-slate-200">
            {(["fields", "branding"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === t
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {t === "fields" ? "Fields" : "Branding"}
              </button>
            ))}
          </div>

          <div className="p-4">
            {tab === "fields" ? (
              selectedFieldData ? (
                <FieldProperties
                  field={selectedFieldData}
                  onChange={(changes) => updateField(selectedFieldData.id, changes)}
                  onDeselect={() => setSelectedField(null)}
                />
              ) : (
                <FormSettings settings={form.settings} onChange={updateSettings} />
              )
            ) : (
              <BrandingPanel branding={form.branding} onChange={updateBranding} />
            )}
          </div>
        </div>
      </div>

      {/* Preview modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Form Preview</h3>
              <button onClick={() => setShowPreview(false)} className="p-1 rounded hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-4">
              <iframe
                src={`/f/${formId}?preview=1`}
                className="w-full border border-slate-200 rounded-lg"
                style={{ minHeight: 400 }}
                title="Form preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Embed modal */}
      {showEmbed && (
        <EmbedModal
          formId={formId}
          portalUrl={portalUrl}
          onClose={() => setShowEmbed(false)}
        />
      )}
    </div>
  );
}

// ─── Field preview on canvas ─────────────────────────────────
function FieldPreview({ field, branding }: { field: FormField; branding: Record<string, unknown> }) {
  const radius = `${(branding.border_radius as number) || 8}px`;
  const inputClass = "w-full px-3 py-2 border border-slate-200 text-sm text-slate-400 bg-white";

  switch (field.type) {
    case "textarea":
      return <textarea disabled placeholder={field.placeholder || ""} className={inputClass} style={{ borderRadius: radius }} rows={3} />;
    case "select":
      return (
        <select disabled className={inputClass} style={{ borderRadius: radius }}>
          <option>{field.placeholder || "Select..."}</option>
          {(field.options || []).map((o) => <option key={o}>{o}</option>)}
        </select>
      );
    case "checkbox":
      return (
        <div className="space-y-1">
          {(field.options || []).map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" disabled className="rounded" /> {o}
            </label>
          ))}
        </div>
      );
    case "radio":
      return (
        <div className="space-y-1">
          {(field.options || []).map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm text-slate-600">
              <input type="radio" disabled name={field.id} /> {o}
            </label>
          ))}
        </div>
      );
    case "hidden":
      return <p className="text-xs text-slate-400 italic">Hidden field</p>;
    default:
      return (
        <input
          type={field.type === "email" ? "email" : field.type === "number" ? "number" : "text"}
          disabled
          placeholder={field.placeholder || ""}
          className={inputClass}
          style={{ borderRadius: radius }}
        />
      );
  }
}

// ─── Field properties panel ──────────────────────────────────
function FieldProperties({
  field,
  onChange,
  onDeselect,
}: {
  field: FormField;
  onChange: (changes: Partial<FormField>) => void;
  onDeselect: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Field Properties</h3>
        <button onClick={onDeselect} className="text-xs text-brand-600 hover:underline">
          Done
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Label</label>
        <input
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Placeholder</label>
        <input
          value={field.placeholder || ""}
          onChange={(e) => onChange({ placeholder: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
        <select
          value={field.type}
          onChange={(e) => onChange({ type: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {FIELD_TYPES.map((t) => (
            <option key={t.type} value={t.type}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-700">Required</span>
        <button
          onClick={() => onChange({ required: !field.required })}
          className={`w-10 h-6 rounded-full transition-colors ${
            field.required ? "bg-brand-600" : "bg-slate-200"
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
              field.required ? "translate-x-[18px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Width</label>
        <div className="flex gap-2">
          {["full", "half"].map((w) => (
            <button
              key={w}
              onClick={() => onChange({ width: w })}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                field.width === w
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {w === "full" ? "Full width" : "Half width"}
            </button>
          ))}
        </div>
      </div>

      {/* Options for select/checkbox/radio */}
      {["select", "checkbox", "radio"].includes(field.type) && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Options</label>
          <div className="space-y-1.5">
            {(field.options || []).map((opt, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <input
                  value={opt}
                  onChange={(e) => {
                    const options = [...(field.options || [])];
                    options[idx] = e.target.value;
                    onChange({ options });
                  }}
                  className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <button
                  onClick={() => {
                    const options = (field.options || []).filter((_, i) => i !== idx);
                    onChange({ options });
                  }}
                  className="p-1 text-slate-400 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const options = [...(field.options || []), `Option ${(field.options || []).length + 1}`];
                onChange({ options });
              }}
              className="text-xs text-brand-600 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add option
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Form settings panel (no field selected) ─────────────────
function FormSettings({
  settings,
  onChange,
}: {
  settings: Record<string, unknown>;
  onChange: (changes: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-900">Form Settings</h3>
      <p className="text-xs text-slate-500">Click a field on the canvas to edit its properties.</p>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-slate-600">Success Message</label>
          <AiGenerateButton
            type="form_success_message"
            context={{ existingContent: (settings.success_message as string) || "" }}
            onSelect={(v) => onChange({ success_message: v })}
          />
        </div>
        <textarea
          value={(settings.success_message as string) || ""}
          onChange={(e) => onChange({ success_message: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Redirect URL (optional)</label>
        <input
          value={(settings.redirect_url as string) || ""}
          onChange={(e) => onChange({ redirect_url: e.target.value || null })}
          placeholder="https://..."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <Toggle
        label="Double opt-in"
        description="Send verification email before creating contact"
        value={Boolean(settings.double_opt_in)}
        onChange={(v) => onChange({ double_opt_in: v })}
      />

      {Boolean(settings.double_opt_in) && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Verification Email Subject</label>
          <input
            value={(settings.double_opt_in_email_subject as string) || "Please confirm your subscription"}
            onChange={(e) => onChange({ double_opt_in_email_subject: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      )}

      <Toggle
        label="Auto-create contact"
        description="Create a CRM contact from submissions"
        value={settings.auto_create_contact !== false}
        onChange={(v) => onChange({ auto_create_contact: v })}
      />

      {settings.auto_create_contact !== false && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Default Contact Type</label>
          <select
            value={(settings.default_contact_type as string) || "lead"}
            onChange={(e) => onChange({ default_contact_type: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="lead">Lead</option>
            <option value="retail">Retail</option>
            <option value="wholesale">Wholesale</option>
          </select>
        </div>
      )}

      <Toggle
        label="Email notification"
        description="Email you when someone submits"
        value={settings.notification_email !== false}
        onChange={(v) => onChange({ notification_email: v })}
      />

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">GDPR Consent Text</label>
        <textarea
          value={(settings.gdpr_consent_text as string) || ""}
          onChange={(e) => onChange({ gdpr_consent_text: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
    </div>
  );
}

// ─── Branding panel ──────────────────────────────────────────
function BrandingPanel({
  branding,
  onChange,
}: {
  branding: Record<string, unknown>;
  onChange: (changes: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-900">Branding</h3>

      <ColorPicker label="Background" value={(branding.background_colour as string) || "#ffffff"} onChange={(v) => onChange({ background_colour: v })} />
      <ColorPicker label="Text" value={(branding.text_colour as string) || "#1e293b"} onChange={(v) => onChange({ text_colour: v })} />
      <ColorPicker label="Accent" value={(branding.accent_colour as string) || "#2563eb"} onChange={(v) => onChange({ accent_colour: v })} />
      <ColorPicker label="Button" value={(branding.button_colour as string) || "#2563eb"} onChange={(v) => onChange({ button_colour: v })} />
      <ColorPicker label="Button Text" value={(branding.button_text_colour as string) || "#ffffff"} onChange={(v) => onChange({ button_text_colour: v })} />

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Font Family</label>
        <select
          value={(branding.font_family as string) || "system-ui"}
          onChange={(e) => onChange({ font_family: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="system-ui">System Default</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="'Courier New', monospace">Courier New</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          {`Border Radius: ${(branding.border_radius as number) || 8}px`}
        </label>
        <input
          type="range"
          min={0}
          max={24}
          value={(branding.border_radius as number) || 8}
          onChange={(e) => onChange({ border_radius: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Logo URL</label>
        <input
          value={(branding.logo_url as string) || ""}
          onChange={(e) => onChange({ logo_url: e.target.value || null })}
          placeholder="https://..."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-slate-700">Powered by badge</span>
          <p className="text-xs text-slate-500">Cannot be removed on Growth tier</p>
        </div>
        <div className="w-10 h-6 rounded-full bg-brand-600 opacity-50 cursor-not-allowed">
          <div className="w-5 h-5 bg-white rounded-full shadow-sm translate-x-[18px]" />
        </div>
      </div>
    </div>
  );
}

// ─── Embed modal ─────────────────────────────────────────────
function EmbedModal({ formId, portalUrl, onClose }: { formId: string; portalUrl: string; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);

  const hostedUrl = `${portalUrl}/f/${formId}`;
  const embedCode = `<div id="gr-form-${formId}"></div>\n<script src="${portalUrl}/api/forms/embed?id=${formId}"></script>`;
  const iframeCode = `<iframe\n  src="${portalUrl}/f/${formId}?embed=1"\n  width="100%"\n  height="800"\n  frameborder="0"\n  style="border:none;overflow:hidden;background:transparent;">\n</iframe>`;

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">Share & Embed</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="p-4 space-y-6">
          {/* Hosted URL */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Hosted URL</label>
            <p className="text-xs text-slate-500 mb-2">Share this link directly. Opens a standalone page with your form.</p>
            <div className="flex gap-2">
              <input
                value={hostedUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-700"
              />
              <button
                onClick={() => copyToClipboard(hostedUrl, "url")}
                className="inline-flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50"
              >
                {copied === "url" ? "Copied!" : <><Copy className="w-3.5 h-3.5" />Copy</>}
              </button>
            </div>
          </div>

          {/* Script embed */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Script Embed <span className="text-xs font-normal text-slate-400">(recommended)</span></label>
            <p className="text-xs text-slate-500 mb-2">Auto-resizing embed. Paste this into your website HTML.</p>
            <div className="relative">
              <pre className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 overflow-x-auto whitespace-pre-wrap">
                {embedCode}
              </pre>
              <button
                onClick={() => copyToClipboard(embedCode, "embed")}
                className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded text-xs hover:bg-slate-50"
              >
                {copied === "embed" ? "Copied!" : <><Copy className="w-3 h-3" />Copy</>}
              </button>
            </div>
          </div>

          {/* iFrame fallback */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">iFrame Fallback</label>
            <p className="text-xs text-slate-500 mb-2">Use this if your website blocks scripts (Squarespace, Wix, etc.).</p>
            <div className="relative">
              <pre className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 overflow-x-auto whitespace-pre-wrap">
                {iframeCode}
              </pre>
              <button
                onClick={() => copyToClipboard(iframeCode, "iframe")}
                className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded text-xs hover:bg-slate-50"
              >
                {copied === "iframe" ? "Copied!" : <><Copy className="w-3 h-3" />Copy</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared components ───────────────────────────────────────
function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-sm text-slate-700">{label}</span>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-10 h-6 rounded-full transition-colors ${value ? "bg-brand-600" : "bg-slate-200"}`}
      >
        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${value ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
    </div>
  );
}
