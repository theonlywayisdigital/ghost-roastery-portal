"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Save,
  X,
  Edit3,
  Plus,
  Trash2,
  Package,
  Flame,
  Coffee,
  Loader2,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  GripVertical,
} from "lucide-react";

// ── Types ──

interface BagSize {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RoastProfile {
  id: string;
  name: string;
  slug: string;
  descriptor: string | null;
  tasting_notes: string | null;
  roast_level: number | null;
  is_decaf: boolean;
  badge: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface GrindOption {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Tabs ──

type Tab = "bag-sizes" | "roast-profiles" | "grind-options";

const TABS: { key: Tab; label: string; icon: typeof Package }[] = [
  { key: "bag-sizes", label: "Bag Sizes", icon: Package },
  { key: "roast-profiles", label: "Roast Profiles", icon: Flame },
  { key: "grind-options", label: "Grind Options", icon: Coffee },
];

// ── Main Component ──

export function AdminBuilderConfig() {
  const [activeTab, setActiveTab] = useState<Tab>("bag-sizes");
  const [bagSizes, setBagSizes] = useState<BagSize[]>([]);
  const [roastProfiles, setRoastProfiles] = useState<RoastProfile[]>([]);
  const [grindOptions, setGrindOptions] = useState<GrindOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sizesRes, roastsRes, grindsRes] = await Promise.all([
        fetch("/api/admin/builder/bag-sizes"),
        fetch("/api/admin/builder/roast-profiles"),
        fetch("/api/admin/builder/grind-options"),
      ]);

      if (!sizesRes.ok || !roastsRes.ok || !grindsRes.ok) {
        throw new Error("Failed to load builder config");
      }

      const [sizesData, roastsData, grindsData] = await Promise.all([
        sizesRes.json(),
        roastsRes.json(),
        grindsRes.json(),
      ]);

      setBagSizes(sizesData.bagSizes || []);
      setRoastProfiles(roastsData.roastProfiles || []);
      setGrindOptions(grindsData.grindOptions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        <span className="ml-2 text-slate-500">Loading builder config...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg">
        <AlertTriangle className="w-5 h-5 inline mr-2" />
        {error}
        <button onClick={fetchData} className="ml-4 underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Builder Config</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage bag sizes, roast profiles, and grind options for the coffee builder.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "bag-sizes" && (
        <BagSizesTab items={bagSizes} onUpdate={fetchData} />
      )}
      {activeTab === "roast-profiles" && (
        <RoastProfilesTab items={roastProfiles} onUpdate={fetchData} />
      )}
      {activeTab === "grind-options" && (
        <GrindOptionsTab items={grindOptions} onUpdate={fetchData} />
      )}
    </div>
  );
}

// ── Bag Sizes Tab ──

function BagSizesTab({
  items,
  onUpdate,
}: {
  items: BagSize[];
  onUpdate: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<BagSize>>({});
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", description: "", sort_order: 0 });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const startEdit = (item: BagSize) => {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      description: item.description || "",
      sort_order: item.sort_order,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/builder/bag-sizes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
      setEditingId(null);
      setEditForm({});
      setFeedback("Bag size updated");
      onUpdate();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const toggleActive = async (item: BagSize) => {
    try {
      const res = await fetch(`/api/admin/builder/bag-sizes/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      onUpdate();
    } catch {
      setFeedback("Failed to toggle active status");
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const deleteItem = async (item: BagSize) => {
    if (!confirm(`Deactivate "${item.name}"? This will hide it from the builder.`)) return;
    try {
      const res = await fetch(`/api/admin/builder/bag-sizes/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      setFeedback("Bag size deactivated");
      onUpdate();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const addItem = async () => {
    if (!addForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/builder/bag-sizes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create");
      }
      setAdding(false);
      setAddForm({ name: "", description: "", sort_order: 0 });
      setFeedback("Bag size added");
      onUpdate();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="space-y-4">
      {feedback && <FeedbackBanner message={feedback} />}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {items.filter((i) => i.is_active).length} active / {items.length} total
        </p>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Bag Size
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Order</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Description</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr
                key={item.id}
                className={!item.is_active ? "opacity-50 bg-slate-50" : ""}
              >
                {editingId === item.id ? (
                  <>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={editForm.sort_order ?? 0}
                        onChange={(e) =>
                          setEditForm({ ...editForm, sort_order: parseInt(e.target.value) || 0 })
                        }
                        className="w-16 px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editForm.name ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={(editForm.description as string) ?? ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, description: e.target.value })
                        }
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge active={item.is_active} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => saveEdit(item.id)}
                          disabled={saving}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          title="Save"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-slate-400">
                      <GripVertical className="w-4 h-4 inline mr-1" />
                      {item.sort_order}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                    <td className="px-4 py-3 text-slate-600">{item.description || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge active={item.is_active} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleActive(item)}
                          className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"
                          title={item.is_active ? "Deactivate" : "Activate"}
                        >
                          {item.is_active ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => startEdit(item)}
                          className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteItem(item)}
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No bag sizes yet. Click &quot;Add Bag Size&quot; to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add form */}
      {adding && (
        <AddFormCard title="New Bag Size" onCancel={() => setAdding(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
              <input
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="e.g. 250g"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <input
                type="text"
                value={addForm.description}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                placeholder="e.g. Perfect for gifting"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sort Order</label>
              <input
                type="number"
                value={addForm.sort_order}
                onChange={(e) =>
                  setAddForm({ ...addForm, sort_order: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setAdding(false)}
              className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={addItem}
              disabled={saving || !addForm.name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Create
            </button>
          </div>
        </AddFormCard>
      )}
    </div>
  );
}

// ── Roast Profiles Tab ──

function RoastProfilesTab({
  items,
  onUpdate,
}: {
  items: RoastProfile[];
  onUpdate: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<RoastProfile>>({});
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    descriptor: "",
    tasting_notes: "",
    roast_level: 2,
    is_decaf: false,
    badge: "",
    sort_order: 0,
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const startEdit = (item: RoastProfile) => {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      descriptor: item.descriptor || "",
      tasting_notes: item.tasting_notes || "",
      roast_level: item.roast_level ?? 2,
      is_decaf: item.is_decaf,
      badge: item.badge || "",
      sort_order: item.sort_order,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/builder/roast-profiles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
      setEditingId(null);
      setEditForm({});
      setFeedback("Roast profile updated");
      onUpdate();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const toggleActive = async (item: RoastProfile) => {
    try {
      const res = await fetch(`/api/admin/builder/roast-profiles/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      onUpdate();
    } catch {
      setFeedback("Failed to toggle active status");
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const deleteItem = async (item: RoastProfile) => {
    if (!confirm(`Deactivate "${item.name}"? This will hide it from the builder.`)) return;
    try {
      const res = await fetch(`/api/admin/builder/roast-profiles/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      setFeedback("Roast profile deactivated");
      onUpdate();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const addItem = async () => {
    if (!addForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/builder/roast-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create");
      }
      setAdding(false);
      setAddForm({
        name: "",
        descriptor: "",
        tasting_notes: "",
        roast_level: 2,
        is_decaf: false,
        badge: "",
        sort_order: 0,
      });
      setFeedback("Roast profile added");
      onUpdate();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="space-y-4">
      {feedback && <FeedbackBanner message={feedback} />}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {items.filter((i) => i.is_active).length} active / {items.length} total
        </p>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Roast Profile
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Order</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Descriptor</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Tasting Notes</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Level</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Decaf</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={!item.is_active ? "opacity-50 bg-slate-50" : ""}
                >
                  {editingId === item.id ? (
                    <>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editForm.sort_order ?? 0}
                          onChange={(e) =>
                            setEditForm({ ...editForm, sort_order: parseInt(e.target.value) || 0 })
                          }
                          className="w-16 px-2 py-1 border border-slate-300 rounded text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editForm.name ?? ""}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={(editForm.descriptor as string) ?? ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm, descriptor: e.target.value })
                          }
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={(editForm.tasting_notes as string) ?? ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm, tasting_notes: e.target.value })
                          }
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={1}
                          max={4}
                          value={editForm.roast_level ?? 2}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              roast_level: parseInt(e.target.value) || 2,
                            })
                          }
                          className="w-16 px-2 py-1 border border-slate-300 rounded text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={editForm.is_decaf ?? false}
                          onChange={(e) =>
                            setEditForm({ ...editForm, is_decaf: e.target.checked })
                          }
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge active={item.is_active} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => saveEdit(item.id)}
                            disabled={saving}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                            title="Save"
                          >
                            {saving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-slate-400">
                        <GripVertical className="w-4 h-4 inline mr-1" />
                        {item.sort_order}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-400">{item.slug}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.descriptor || "—"}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
                        {item.tasting_notes || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <RoastLevelBars level={item.roast_level ?? 0} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.is_decaf && (
                          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                            DECAF
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge active={item.is_active} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => toggleActive(item)}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"
                            title={item.is_active ? "Deactivate" : "Activate"}
                          >
                            {item.is_active ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => startEdit(item)}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteItem(item)}
                            className="p-1.5 text-red-400 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No roast profiles yet. Click &quot;Add Roast Profile&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add form */}
      {adding && (
        <AddFormCard title="New Roast Profile" onCancel={() => setAdding(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
              <input
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="e.g. Light Roast"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Descriptor</label>
              <input
                type="text"
                value={addForm.descriptor}
                onChange={(e) => setAddForm({ ...addForm, descriptor: e.target.value })}
                placeholder="e.g. Fruity & Bright"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tasting Notes</label>
              <input
                type="text"
                value={addForm.tasting_notes}
                onChange={(e) => setAddForm({ ...addForm, tasting_notes: e.target.value })}
                placeholder="e.g. Floral, citrus, tea-like"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Roast Level (1-4)</label>
              <input
                type="number"
                min={1}
                max={4}
                value={addForm.roast_level}
                onChange={(e) =>
                  setAddForm({ ...addForm, roast_level: parseInt(e.target.value) || 2 })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Badge (optional)</label>
              <input
                type="text"
                value={addForm.badge}
                onChange={(e) => setAddForm({ ...addForm, badge: e.target.value })}
                placeholder="e.g. DECAF"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sort Order</label>
              <input
                type="number"
                value={addForm.sort_order}
                onChange={(e) =>
                  setAddForm({ ...addForm, sort_order: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={addForm.is_decaf}
                onChange={(e) => setAddForm({ ...addForm, is_decaf: e.target.checked })}
                className="rounded"
              />
              Decaf option
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setAdding(false)}
              className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={addItem}
              disabled={saving || !addForm.name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Create
            </button>
          </div>
        </AddFormCard>
      )}
    </div>
  );
}

// ── Grind Options Tab ──

function GrindOptionsTab({
  items,
  onUpdate,
}: {
  items: GrindOption[];
  onUpdate: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<GrindOption>>({});
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", description: "", sort_order: 0 });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const startEdit = (item: GrindOption) => {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      description: item.description || "",
      sort_order: item.sort_order,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/builder/grind-options/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
      setEditingId(null);
      setEditForm({});
      setFeedback("Grind option updated");
      onUpdate();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const toggleActive = async (item: GrindOption) => {
    try {
      const res = await fetch(`/api/admin/builder/grind-options/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      onUpdate();
    } catch {
      setFeedback("Failed to toggle active status");
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const deleteItem = async (item: GrindOption) => {
    if (!confirm(`Deactivate "${item.name}"? This will hide it from the builder.`)) return;
    try {
      const res = await fetch(`/api/admin/builder/grind-options/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      setFeedback("Grind option deactivated");
      onUpdate();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const addItem = async () => {
    if (!addForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/builder/grind-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create");
      }
      setAdding(false);
      setAddForm({ name: "", description: "", sort_order: 0 });
      setFeedback("Grind option added");
      onUpdate();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="space-y-4">
      {feedback && <FeedbackBanner message={feedback} />}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {items.filter((i) => i.is_active).length} active / {items.length} total
        </p>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Grind Option
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Order</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Description</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr
                key={item.id}
                className={!item.is_active ? "opacity-50 bg-slate-50" : ""}
              >
                {editingId === item.id ? (
                  <>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={editForm.sort_order ?? 0}
                        onChange={(e) =>
                          setEditForm({ ...editForm, sort_order: parseInt(e.target.value) || 0 })
                        }
                        className="w-16 px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editForm.name ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={(editForm.description as string) ?? ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, description: e.target.value })
                        }
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge active={item.is_active} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => saveEdit(item.id)}
                          disabled={saving}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          title="Save"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-slate-400">
                      <GripVertical className="w-4 h-4 inline mr-1" />
                      {item.sort_order}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                    <td className="px-4 py-3 text-slate-600">{item.description || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge active={item.is_active} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleActive(item)}
                          className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"
                          title={item.is_active ? "Deactivate" : "Activate"}
                        >
                          {item.is_active ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => startEdit(item)}
                          className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteItem(item)}
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No grind options yet. Click &quot;Add Grind Option&quot; to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add form */}
      {adding && (
        <AddFormCard title="New Grind Option" onCancel={() => setAdding(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
              <input
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="e.g. Espresso"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <input
                type="text"
                value={addForm.description}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                placeholder="e.g. For espresso machines and moka pots"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sort Order</label>
              <input
                type="number"
                value={addForm.sort_order}
                onChange={(e) =>
                  setAddForm({ ...addForm, sort_order: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setAdding(false)}
              className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={addItem}
              disabled={saving || !addForm.name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Create
            </button>
          </div>
        </AddFormCard>
      )}
    </div>
  );
}

// ── Shared Components ──

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
        active
          ? "bg-green-100 text-green-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function RoastLevelBars({ level }: { level: number }) {
  return (
    <div className="flex items-center justify-center gap-0.5">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`w-2.5 h-4 rounded-sm ${
            i <= level ? "bg-amber-700" : "bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

function FeedbackBanner({ message }: { message: string }) {
  const isError =
    message.toLowerCase().includes("fail") || message.toLowerCase().includes("error");
  return (
    <div
      className={`px-4 py-2 rounded-lg text-sm ${
        isError ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
      }`}
    >
      {isError ? (
        <AlertTriangle className="w-4 h-4 inline mr-1.5" />
      ) : (
        <Check className="w-4 h-4 inline mr-1.5" />
      )}
      {message}
    </div>
  );
}

function AddFormCard({
  title,
  onCancel,
  children,
}: {
  title: string;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <button
          onClick={onCancel}
          className="p-1 text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {children}
    </div>
  );
}
