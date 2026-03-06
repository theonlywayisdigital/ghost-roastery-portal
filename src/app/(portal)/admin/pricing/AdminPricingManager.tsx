"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Save,
  X,
  Edit3,
  Plus,
  History,
  Settings,
  Package,
  AlertTriangle,
  Check,
  Loader2,
  Trash2,
  Layers,
} from "@/components/icons";

// ── Types ──

interface Bracket {
  id: string;
  min_quantity: number;
  max_quantity: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Price {
  id: string;
  bracket_id: string;
  bag_size: string;
  price_per_bag: number;
  shipping_cost: number;
  currency: string;
  is_active: boolean;
}

interface BuilderSettings {
  id: string;
  max_order_quantity: number;
  wholesale_threshold: number;
  min_order_quantity: number; // derived from brackets
  updated_at: string;
}

interface HistoryEntry {
  id: string;
  record_type: string;
  record_id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
}

// ── Tabs ──

type Tab = "brackets" | "prices" | "settings" | "history";

const TABS: { key: Tab; label: string; icon: typeof Package }[] = [
  { key: "brackets", label: "Tier Brackets", icon: Layers },
  { key: "prices", label: "Price Grid", icon: Package },
  { key: "settings", label: "Order Settings", icon: Settings },
  { key: "history", label: "Change History", icon: History },
];

// ── Helpers ──

function getBracketLabel(b: Bracket) {
  return `${b.min_quantity}–${b.max_quantity}`;
}

// ── Main Component ──

export function AdminPricingManager() {
  const [activeTab, setActiveTab] = useState<Tab>("brackets");
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [settings, setSettings] = useState<BuilderSettings | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [allBagSizes, setAllBagSizes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pricingRes, settingsRes, bagSizesRes] = await Promise.all([
        fetch("/api/admin/pricing"),
        fetch("/api/admin/pricing/settings"),
        fetch("/api/admin/builder/bag-sizes"),
      ]);

      if (!pricingRes.ok || !settingsRes.ok) {
        throw new Error("Failed to load pricing data");
      }

      const pricingData = await pricingRes.json();
      const settingsData = await settingsRes.json();

      setBrackets(pricingData.brackets || []);
      setPrices(pricingData.prices || []);
      setSettings(settingsData.settings || null);

      if (bagSizesRes.ok) {
        const bagSizesData = await bagSizesRes.json();
        const names = (bagSizesData.bagSizes || [])
          .filter((bs: { is_active: boolean }) => bs.is_active)
          .map((bs: { name: string }) => bs.name);
        setAllBagSizes(names);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pricing/history?limit=100");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch {
      // Silent fail for history
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          <span className="ml-2 text-slate-500">Loading pricing data...</span>
        </div>
      </div>
    );
  }

  const activeBrackets = brackets.filter((b) => b.is_active);

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Pricing Management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage dynamic pricing brackets, per-bag prices, order settings, and view change history.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <div className="flex gap-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
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
      {activeTab === "brackets" && (
        <BracketsTab brackets={brackets} onRefresh={fetchData} />
      )}
      {activeTab === "prices" && (
        <PriceGridTab
          brackets={activeBrackets}
          prices={prices.filter((p) => p.is_active)}
          allBagSizes={allBagSizes}
          onRefresh={fetchData}
        />
      )}
      {activeTab === "settings" && settings && (
        <OrderSettingsTab settings={settings} onRefresh={fetchData} />
      )}
      {activeTab === "history" && (
        <ChangeHistoryTab history={history} brackets={brackets} />
      )}
    </div>
  );
}

// ── Brackets Tab ──

function BracketsTab({
  brackets,
  onRefresh,
}: {
  brackets: Bracket[];
  onRefresh: () => Promise<void>;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ min: "", max: "" });
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const activeBrackets = brackets.filter((b) => b.is_active).sort((a, b) => a.sort_order - b.sort_order);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/pricing/brackets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          min_quantity: parseInt(addForm.min),
          max_quantity: parseInt(addForm.max),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create");
      }
      setShowAdd(false);
      setAddForm({ min: "", max: "" });
      await onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Deactivate this bracket? Prices within it will remain but no longer apply.")) return;
    setRemoving(id);
    try {
      const res = await fetch(`/api/admin/pricing/brackets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to deactivate");
      await onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Tier Brackets</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Define quantity ranges. Add or remove brackets without code changes.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          <Plus className="w-4 h-4" />
          Add Bracket
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="grid grid-cols-2 gap-3 max-w-xs">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min Quantity</label>
              <input type="number" min="1" required value={addForm.min} onChange={(e) => setAddForm({ ...addForm, min: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Quantity</label>
              <input type="number" min="1" required value={addForm.max} onChange={(e) => setAddForm({ ...addForm, max: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Create
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Order</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Range</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Label</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activeBrackets.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">No brackets defined yet.</td></tr>
            ) : (
              activeBrackets.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-500">{b.sort_order}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{b.min_quantity} – {b.max_quantity}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{getBracketLabel(b)} bags</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-50 text-green-700">Active</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRemove(b.id)}
                      disabled={removing === b.id}
                      className="p-1.5 text-red-400 hover:text-red-600 rounded disabled:opacity-50"
                      title="Deactivate bracket"
                    >
                      {removing === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Price Grid Tab ──

function PriceGridTab({
  brackets,
  prices,
  allBagSizes,
  onRefresh,
}: {
  brackets: Bracket[];
  prices: Price[];
  allBagSizes: string[];
  onRefresh: () => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  // For creating a new price in an empty cell
  const [creatingCell, setCreatingCell] = useState<string | null>(null); // "bracketId:bagSize"
  const [createValue, setCreateValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ bag_size: "", prices: {} as Record<string, string> });
  const [deletingBagSize, setDeletingBagSize] = useState<string | null>(null);

  // Bag sizes that already have at least one price
  const pricedBagSizes = Array.from(new Set(prices.map((p) => p.bag_size))).sort();
  // Bag sizes available to add (from bag_sizes table, excluding already-priced)
  const availableBagSizes = allBagSizes.filter((s) => !pricedBagSizes.includes(s));

  // Get price for bracket + bag size
  function getPrice(bracketId: string, bagSize: string): Price | undefined {
    return prices.find((p) => p.bracket_id === bracketId && p.bag_size === bagSize);
  }

  async function savePrice(priceId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/pricing/prices/${priceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price_per_bag: parseFloat(editValue) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      setEditingId(null);
      setSaveSuccess(priceId);
      setTimeout(() => setSaveSuccess(null), 2000);
      await onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function createSinglePrice(bracketId: string, bagSize: string) {
    if (!createValue || isNaN(parseFloat(createValue))) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/pricing/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bracket_id: bracketId,
          bag_size: bagSize,
          price_per_bag: parseFloat(createValue),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create price");
      }
      setCreatingCell(null);
      setCreateValue("");
      await onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddBagSize(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.bag_size) return;
    setSaving(true);
    try {
      // Create a price for each bracket
      for (const bracket of brackets) {
        const priceVal = addForm.prices[bracket.id];
        if (!priceVal) continue;
        const res = await fetch("/api/admin/pricing/prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bracket_id: bracket.id,
            bag_size: addForm.bag_size,
            price_per_bag: parseFloat(priceVal),
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create price");
        }
      }
      setShowAdd(false);
      setAddForm({ bag_size: "", prices: {} });
      await onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteBagSize(bagSize: string) {
    if (!confirm(`Delete all prices for "${bagSize}"? This will remove pricing for this bag size across all brackets.`)) return;
    setDeletingBagSize(bagSize);
    try {
      const res = await fetch(`/api/admin/pricing/prices?bag_size=${encodeURIComponent(bagSize)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      await onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingBagSize(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Price Grid</h2>
          <p className="text-sm text-slate-500 mt-0.5">Click a price to edit it inline. Click &quot;—&quot; to add a missing price.</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          disabled={availableBagSizes.length === 0 && !showAdd}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          title={availableBagSizes.length === 0 ? "All bag sizes already have pricing" : undefined}
        >
          <Plus className="w-4 h-4" />
          Add Bag Size
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAddBagSize} className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Bag Size</label>
              {availableBagSizes.length > 0 ? (
                <select
                  required
                  value={addForm.bag_size}
                  onChange={(e) => setAddForm({ ...addForm, bag_size: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="">Select bag size...</option>
                  {availableBagSizes.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-slate-500 py-2">All bag sizes already have pricing. Add a new bag size in Builder Config first.</p>
              )}
            </div>
            {brackets.map((b) => (
              <div key={b.id}>
                <label className="block text-xs font-medium text-slate-700 mb-1">{getBracketLabel(b)} bags</label>
                <input type="number" step="0.01" min="0" required value={addForm.prices[b.id] || ""} onChange={(e) => setAddForm({ ...addForm, prices: { ...addForm.prices, [b.id]: e.target.value } })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving || !addForm.bag_size} className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Create
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                Bag Size
              </th>
              {brackets.map((b) => (
                <th key={b.id} className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                  {getBracketLabel(b)} bags
                </th>
              ))}
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pricedBagSizes.length === 0 ? (
              <tr><td colSpan={brackets.length + 2} className="px-4 py-8 text-center text-sm text-slate-500">No prices configured yet. Click &quot;Add Bag Size&quot; to get started.</td></tr>
            ) : (
              pricedBagSizes.map((size) => (
                <tr key={size} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{size}</td>
                  {brackets.map((b) => {
                    const price = getPrice(b.id, size);
                    const cellKey = `${b.id}:${size}`;
                    const isEditing = editingId === price?.id;
                    const isCreating = creatingCell === cellKey;
                    const isSuccess = saveSuccess === price?.id;
                    return (
                      <td key={b.id} className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-20 px-2 py-1 text-sm text-right border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-500"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") { e.preventDefault(); price && savePrice(price.id); }
                                if (e.key === "Escape") setEditingId(null);
                              }}
                            />
                            <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                            <button onClick={() => price && savePrice(price.id)} disabled={saving} className="p-1 text-brand-600 hover:text-brand-700 disabled:opacity-50">
                              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ) : isCreating ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={createValue}
                              onChange={(e) => setCreateValue(e.target.value)}
                              className="w-20 px-2 py-1 text-sm text-right border border-brand-300 rounded-md focus:ring-2 focus:ring-brand-500 bg-brand-50"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") { e.preventDefault(); createSinglePrice(b.id, size); }
                                if (e.key === "Escape") { setCreatingCell(null); setCreateValue(""); }
                              }}
                            />
                            <button onClick={() => { setCreatingCell(null); setCreateValue(""); }} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                            <button onClick={() => createSinglePrice(b.id, size)} disabled={saving || !createValue} className="p-1 text-brand-600 hover:text-brand-700 disabled:opacity-50">
                              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ) : isSuccess ? (
                          <Check className="w-4 h-4 text-green-600 inline" />
                        ) : price ? (
                          <button
                            onClick={() => { setEditingId(price.id); setEditValue(String(price.price_per_bag)); }}
                            className="text-sm text-slate-700 hover:text-brand-700 cursor-pointer"
                            title="Click to edit"
                          >
                            £{Number(price.price_per_bag).toFixed(2)}
                          </button>
                        ) : (
                          <button
                            onClick={() => { setCreatingCell(cellKey); setCreateValue(""); }}
                            className="text-sm text-slate-300 hover:text-brand-500 cursor-pointer transition-colors"
                            title="Click to add price"
                          >
                            + Add
                          </button>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDeleteBagSize(size)}
                      disabled={deletingBagSize === size}
                      className="p-1.5 text-red-400 hover:text-red-600 rounded disabled:opacity-50"
                      title={`Delete ${size} prices`}
                    >
                      {deletingBagSize === size ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Order Settings Tab ──

function OrderSettingsTab({
  settings,
  onRefresh,
}: {
  settings: BuilderSettings;
  onRefresh: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    max_order_quantity: String(settings.max_order_quantity),
    wholesale_threshold: String(settings.wholesale_threshold),
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/pricing/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_order_quantity: parseInt(form.max_order_quantity, 10),
          wholesale_threshold: parseInt(form.wholesale_threshold, 10),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save settings");
      }

      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      await onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Order Settings</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Controls shown on the builder quantity step and checkout validation.
          </p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditing(false);
                setForm({
                  max_order_quantity: String(settings.max_order_quantity),
                  wholesale_threshold: String(settings.wholesale_threshold),
                });
              }}
              className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {saveSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700">
            <Check className="w-4 h-4" />
            Settings saved successfully.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Minimum Order Quantity</label>
            <p className="text-xs text-slate-400 mb-2">Derived from lowest bracket&apos;s min quantity.</p>
            <p className="text-2xl font-bold text-slate-900">{settings.min_order_quantity}</p>
            <p className="text-xs text-slate-400 mt-1">Edit brackets to change this.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Maximum Order Quantity</label>
            <p className="text-xs text-slate-400 mb-2">Highest number of bags before wholesale redirect.</p>
            {editing ? (
              <input
                type="number"
                min="1"
                value={form.max_order_quantity}
                onChange={(e) => setForm({ ...form, max_order_quantity: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-brand-500"
              />
            ) : (
              <p className="text-2xl font-bold text-slate-900">{settings.max_order_quantity}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Wholesale Threshold</label>
            <p className="text-xs text-slate-400 mb-2">Orders at this quantity redirect to wholesale.</p>
            {editing ? (
              <input
                type="number"
                min="1"
                value={form.wholesale_threshold}
                onChange={(e) => setForm({ ...form, wholesale_threshold: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-brand-500"
              />
            ) : (
              <p className="text-2xl font-bold text-slate-900">{settings.wholesale_threshold}</p>
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            Last updated: {new Date(settings.updated_at).toLocaleString("en-GB")}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Change History Tab ──

function ChangeHistoryTab({
  history,
  brackets,
}: {
  history: HistoryEntry[];
  brackets: Bracket[];
}) {
  const bracketMap = new Map(brackets.map((b) => [b.id, getBracketLabel(b)]));

  const RECORD_TYPE_LABELS: Record<string, string> = {
    bracket: "Bracket",
    price: "Price",
    partner_rate: "Partner Rate",
  };

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <History className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">No changes recorded yet.</p>
        <p className="text-xs text-slate-400 mt-1">
          Changes will appear here when brackets, prices, or partner rates are updated.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Change History</h2>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Date</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Type</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Field</th>
              <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Old Value</th>
              <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">New Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.map((entry) => (
              <tr key={entry.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-500">
                  {new Date(entry.changed_at).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                    {RECORD_TYPE_LABELS[entry.record_type] || entry.record_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  {entry.field_changed}
                  {entry.record_type === "bracket" && bracketMap.has(entry.record_id) && (
                    <span className="ml-1 text-xs text-slate-400">({bracketMap.get(entry.record_id)})</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-right text-red-600">
                  {entry.old_value != null ? (
                    isNaN(Number(entry.old_value)) ? entry.old_value : `£${Number(entry.old_value).toFixed(2)}`
                  ) : "—"}
                </td>
                <td className="px-4 py-3 text-sm text-right text-green-600">
                  {entry.new_value != null ? (
                    isNaN(Number(entry.new_value)) ? entry.new_value : `£${Number(entry.new_value).toFixed(2)}`
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
