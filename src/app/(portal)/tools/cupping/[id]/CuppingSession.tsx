"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus, Trash2, X, Check } from "@/components/icons";

// ─── Types ───

interface GreenBean {
  id: string;
  name: string;
}

interface RoastLog {
  id: string;
  roast_label: string | null;
  roast_date: string | null;
}

interface Sample {
  id: string;
  session_id: string;
  sample_number: number;
  sample_label: string | null;
  green_bean_id: string | null;
  roast_log_id: string | null;
  green_beans: { name: string } | null;
  fragrance_aroma: number;
  flavour: number;
  aftertaste: number;
  acidity: number;
  body: number;
  balance: number;
  uniformity: number;
  clean_cup: number;
  sweetness: number;
  overall: number;
  defects_taint: number;
  defects_fault: number;
  total_score: number;
  flavour_tags: string[];
  notes: string | null;
}

interface Session {
  id: string;
  session_date: string;
  session_name: string;
  cupper_name: string | null;
  notes: string | null;
  cupping_samples: Sample[];
}

// ─── Constants ───

const SCA_ATTRIBUTES = [
  { key: "fragrance_aroma", label: "Fragrance/Aroma" },
  { key: "flavour", label: "Flavour" },
  { key: "aftertaste", label: "Aftertaste" },
  { key: "acidity", label: "Acidity" },
  { key: "body", label: "Body" },
  { key: "balance", label: "Balance" },
  { key: "uniformity", label: "Uniformity" },
  { key: "clean_cup", label: "Clean Cup" },
  { key: "sweetness", label: "Sweetness" },
  { key: "overall", label: "Overall" },
] as const;

function computeTotalScore(sample: Record<string, unknown>): number {
  const sum = SCA_ATTRIBUTES.reduce(
    (acc, attr) => acc + (Number(sample[attr.key]) || 0),
    0
  );
  const taint = Number(sample.defects_taint) || 0;
  const fault = Number(sample.defects_fault) || 0;
  return sum - 2 * taint - 4 * fault;
}

function scoreColorClass(score: number): string {
  if (score >= 80) return "text-green-700 bg-green-50 border-green-200";
  if (score >= 70) return "text-blue-700 bg-blue-50 border-blue-200";
  return "text-slate-700 bg-slate-50 border-slate-200";
}

function scoreLabel(score: number): string {
  if (score >= 90) return "Outstanding";
  if (score >= 85) return "Excellent";
  if (score >= 80) return "Very Good";
  if (score >= 75) return "Good";
  if (score >= 70) return "Above Average";
  return "Below Specialty";
}

// ─── Component ───

export function CuppingSession({
  session: initialSession,
  greenBeans,
  roastLogs,
}: {
  session: Session;
  greenBeans: GreenBean[];
  roastLogs: RoastLog[];
}) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [samples, setSamples] = useState<Sample[]>(initialSession.cupping_samples || []);
  const [editingHeader, setEditingHeader] = useState(false);
  const [headerForm, setHeaderForm] = useState({
    session_name: session.session_name,
    session_date: session.session_date,
    cupper_name: session.cupper_name || "",
    notes: session.notes || "",
  });
  const [savingHeader, setSavingHeader] = useState(false);
  const [showAddSample, setShowAddSample] = useState(false);
  const [addingSample, setAddingSample] = useState(false);
  const [newSampleForm, setNewSampleForm] = useState({
    sample_label: "",
    green_bean_id: "",
    roast_log_id: "",
  });
  const [deletingSession, setDeletingSession] = useState(false);

  // Auto-save debounce refs
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(saveTimers.current).forEach(clearTimeout);
    };
  }, []);

  // ─── Session header save ───

  async function saveHeader() {
    setSavingHeader(true);
    const res = await fetch(`/api/tools/cupping/${session.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(headerForm),
    });
    if (res.ok) {
      const data = await res.json();
      setSession((prev) => ({ ...prev, ...data.session }));
      setEditingHeader(false);
    }
    setSavingHeader(false);
  }

  // ─── Delete session ───

  async function handleDeleteSession() {
    if (!confirm(`Delete "${session.session_name}"? This will also delete all samples and cannot be undone.`)) return;
    setDeletingSession(true);
    const res = await fetch(`/api/tools/cupping/${session.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/tools/cupping");
      router.refresh();
    }
    setDeletingSession(false);
  }

  // ─── Sample score update (debounced auto-save) ───

  const debouncedSaveSample = useCallback(
    (sampleId: string, updates: Record<string, unknown>) => {
      if (saveTimers.current[sampleId]) {
        clearTimeout(saveTimers.current[sampleId]);
      }
      saveTimers.current[sampleId] = setTimeout(async () => {
        await fetch(`/api/tools/cupping/${session.id}/samples/${sampleId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
      }, 600);
    },
    [session.id]
  );

  function updateSampleField(sampleId: string, field: string, value: unknown) {
    setSamples((prev) =>
      prev.map((s) => {
        if (s.id !== sampleId) return s;
        const updated = { ...s, [field]: value };
        const total = computeTotalScore(updated as unknown as Record<string, unknown>);
        const withTotal = { ...updated, total_score: total };
        // Auto-save on change
        debouncedSaveSample(sampleId, { [field]: value });
        return withTotal;
      })
    );
  }

  function updateSampleScore(sampleId: string, field: string, value: number) {
    setSamples((prev) =>
      prev.map((s) => {
        if (s.id !== sampleId) return s;
        const updated = { ...s, [field]: value };
        const total = computeTotalScore(updated as unknown as Record<string, unknown>);
        return { ...updated, total_score: total };
      })
    );
  }

  function saveSampleScoreOnBlur(sampleId: string, field: string, value: number) {
    debouncedSaveSample(sampleId, { [field]: value });
  }

  // ─── Add sample ───

  async function handleAddSample(e: React.FormEvent) {
    e.preventDefault();
    setAddingSample(true);

    const nextNumber = samples.length > 0 ? Math.max(...samples.map((s) => s.sample_number)) + 1 : 1;

    const res = await fetch(`/api/tools/cupping/${session.id}/samples`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sample_number: nextNumber,
        sample_label: newSampleForm.sample_label || null,
        green_bean_id: newSampleForm.green_bean_id || null,
        roast_log_id: newSampleForm.roast_log_id || null,
        uniformity: 10,
        clean_cup: 10,
        sweetness: 10,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setSamples((prev) => [...prev, data.sample]);
      setNewSampleForm({ sample_label: "", green_bean_id: "", roast_log_id: "" });
      setShowAddSample(false);
    }
    setAddingSample(false);
  }

  // ─── Delete sample ───

  async function handleDeleteSample(sampleId: string) {
    if (!confirm("Delete this sample?")) return;
    const res = await fetch(`/api/tools/cupping/${session.id}/samples/${sampleId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setSamples((prev) => prev.filter((s) => s.id !== sampleId));
    }
  }

  // ─── Flavour tags ───

  function addFlavourTag(sampleId: string, tag: string) {
    const trimmed = tag.trim();
    if (!trimmed) return;
    setSamples((prev) =>
      prev.map((s) => {
        if (s.id !== sampleId) return s;
        if (s.flavour_tags.includes(trimmed)) return s;
        const updated = [...s.flavour_tags, trimmed];
        debouncedSaveSample(sampleId, { flavour_tags: updated });
        return { ...s, flavour_tags: updated };
      })
    );
  }

  function removeFlavourTag(sampleId: string, tag: string) {
    setSamples((prev) =>
      prev.map((s) => {
        if (s.id !== sampleId) return s;
        const updated = s.flavour_tags.filter((t) => t !== tag);
        debouncedSaveSample(sampleId, { flavour_tags: updated });
        return { ...s, flavour_tags: updated };
      })
    );
  }

  return (
    <div>
      {/* Back + Title */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/tools/cupping"
          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 truncate">{session.session_name}</h1>
          <p className="text-sm text-slate-500">
            {new Date(session.session_date).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            {session.cupper_name ? ` \u2022 ${session.cupper_name}` : ""}
          </p>
        </div>
        <button
          onClick={() => setEditingHeader(!editingHeader)}
          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={handleDeleteSession}
          disabled={deletingSession}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>

      {/* Editable Header */}
      {editingHeader && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Session Name *</label>
              <input
                type="text"
                value={headerForm.session_name}
                onChange={(e) => setHeaderForm((p) => ({ ...p, session_name: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Session Date</label>
              <input
                type="date"
                value={headerForm.session_date}
                onChange={(e) => setHeaderForm((p) => ({ ...p, session_date: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cupper Name</label>
            <input
              type="text"
              value={headerForm.cupper_name}
              onChange={(e) => setHeaderForm((p) => ({ ...p, cupper_name: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={headerForm.notes}
              onChange={(e) => setHeaderForm((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveHeader}
              disabled={savingHeader}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              {savingHeader ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setEditingHeader(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Session notes (read only when not editing) */}
      {!editingHeader && session.notes && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <p className="text-sm text-slate-600">{session.notes}</p>
        </div>
      )}

      {/* Samples */}
      <div className="space-y-6">
        {samples.map((sample) => (
          <SampleCard
            key={sample.id}
            sample={sample}
            onUpdateScore={updateSampleScore}
            onSaveScore={saveSampleScoreOnBlur}
            onUpdateField={updateSampleField}
            onAddTag={addFlavourTag}
            onRemoveTag={removeFlavourTag}
            onDelete={handleDeleteSample}
          />
        ))}
      </div>

      {/* Add Sample */}
      {showAddSample ? (
        <form
          onSubmit={handleAddSample}
          className="mt-6 bg-white rounded-xl border border-slate-200 p-6 space-y-4"
        >
          <h3 className="text-lg font-semibold text-slate-900">Add Sample</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sample Label</label>
              <input
                type="text"
                value={newSampleForm.sample_label}
                onChange={(e) =>
                  setNewSampleForm((p) => ({ ...p, sample_label: e.target.value }))
                }
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                placeholder="e.g. Sample A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Green Bean</label>
              <select
                value={newSampleForm.green_bean_id}
                onChange={(e) =>
                  setNewSampleForm((p) => ({ ...p, green_bean_id: e.target.value }))
                }
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="">Select bean (optional)</option>
                {greenBeans.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Roast Log</label>
              <select
                value={newSampleForm.roast_log_id}
                onChange={(e) =>
                  setNewSampleForm((p) => ({ ...p, roast_log_id: e.target.value }))
                }
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="">Select roast log (optional)</option>
                {roastLogs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.roast_label || `Roast ${r.roast_date || r.id.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={addingSample}
              className="px-6 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {addingSample ? "Adding..." : "Add Sample"}
            </button>
            <button
              type="button"
              onClick={() => setShowAddSample(false)}
              className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowAddSample(true)}
          className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Sample
        </button>
      )}
    </div>
  );
}

// ─── Sample Card ───

function SampleCard({
  sample,
  onUpdateScore,
  onSaveScore,
  onUpdateField,
  onAddTag,
  onRemoveTag,
  onDelete,
}: {
  sample: Sample;
  onUpdateScore: (id: string, field: string, value: number) => void;
  onSaveScore: (id: string, field: string, value: number) => void;
  onUpdateField: (id: string, field: string, value: unknown) => void;
  onAddTag: (id: string, tag: string) => void;
  onRemoveTag: (id: string, tag: string) => void;
  onDelete: (id: string) => void;
}) {
  const [tagInput, setTagInput] = useState("");
  const totalScore = sample.total_score;
  const colorClasses = scoreColorClass(totalScore);

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      onAddTag(sample.id, tagInput);
      setTagInput("");
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      {/* Sample Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-sm font-bold text-slate-700">
              {sample.sample_number}
            </span>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {sample.sample_label || `Sample ${sample.sample_number}`}
              </h3>
              {sample.green_beans?.name && (
                <p className="text-sm text-slate-500">{sample.green_beans.name}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-lg border text-sm font-bold ${colorClasses}`}>
            {totalScore.toFixed(2)} / 100
          </div>
          <span className={`text-xs font-medium ${totalScore >= 80 ? "text-green-600" : totalScore >= 70 ? "text-blue-600" : "text-slate-500"}`}>
            {scoreLabel(totalScore)}
          </span>
          <button
            onClick={() => onDelete(sample.id)}
            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SCA Score Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 mb-5">
        {SCA_ATTRIBUTES.map((attr) => {
          const value = Number((sample as unknown as Record<string, unknown>)[attr.key]) || 0;
          return (
            <div key={attr.key} className="flex items-center gap-3">
              <label className="text-sm text-slate-600 w-32 shrink-0">{attr.label}</label>
              <input
                type="range"
                min={0}
                max={10}
                step={0.25}
                value={value}
                onChange={(e) =>
                  onUpdateScore(sample.id, attr.key, parseFloat(e.target.value))
                }
                onMouseUp={(e) =>
                  onSaveScore(sample.id, attr.key, parseFloat((e.target as HTMLInputElement).value))
                }
                onTouchEnd={(e) =>
                  onSaveScore(sample.id, attr.key, parseFloat((e.target as HTMLInputElement).value))
                }
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
              <span className="text-sm font-medium text-slate-900 w-10 text-right tabular-nums">
                {value.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Defects */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 mb-5 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600 w-32 shrink-0">
            Taint <span className="text-xs text-slate-400">(x2)</span>
          </label>
          <input
            type="range"
            min={0}
            max={5}
            step={1}
            value={sample.defects_taint}
            onChange={(e) =>
              onUpdateScore(sample.id, "defects_taint", parseInt(e.target.value))
            }
            onMouseUp={(e) =>
              onSaveScore(sample.id, "defects_taint", parseInt((e.target as HTMLInputElement).value))
            }
            onTouchEnd={(e) =>
              onSaveScore(sample.id, "defects_taint", parseInt((e.target as HTMLInputElement).value))
            }
            className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
          <span className="text-sm font-medium text-red-700 w-10 text-right tabular-nums">
            {sample.defects_taint}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600 w-32 shrink-0">
            Fault <span className="text-xs text-slate-400">(x4)</span>
          </label>
          <input
            type="range"
            min={0}
            max={5}
            step={1}
            value={sample.defects_fault}
            onChange={(e) =>
              onUpdateScore(sample.id, "defects_fault", parseInt(e.target.value))
            }
            onMouseUp={(e) =>
              onSaveScore(sample.id, "defects_fault", parseInt((e.target as HTMLInputElement).value))
            }
            onTouchEnd={(e) =>
              onSaveScore(sample.id, "defects_fault", parseInt((e.target as HTMLInputElement).value))
            }
            className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
          <span className="text-sm font-medium text-red-700 w-10 text-right tabular-nums">
            {sample.defects_fault}
          </span>
        </div>
      </div>

      {/* Flavour Tags */}
      <div className="mb-4 pt-4 border-t border-slate-100">
        <label className="block text-sm font-medium text-slate-700 mb-2">Flavour Tags</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {(sample.flavour_tags || []).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-50 text-brand-700 rounded-full text-xs font-medium"
            >
              {tag}
              <button
                onClick={() => onRemoveTag(sample.id, tag)}
                className="hover:text-brand-900 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
          onBlur={() => {
            if (tagInput.trim()) {
              onAddTag(sample.id, tagInput);
              setTagInput("");
            }
          }}
          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          placeholder="Type a tag and press Enter..."
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
        <textarea
          value={sample.notes || ""}
          onChange={(e) => onUpdateField(sample.id, "notes", e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          placeholder="Cupping notes for this sample..."
        />
      </div>
    </div>
  );
}
