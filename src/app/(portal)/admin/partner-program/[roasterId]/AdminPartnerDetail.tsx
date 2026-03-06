"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  Loader2,
  AlertTriangle,
  Save,
  X,
  Plus,
  Edit3,
  Trash2,
  Check,
  MapPin,
  History,
  FileText,
  DollarSign,
  Package,
  TrendingUp,
} from "@/components/icons";

// ── Types ──

interface Bracket {
  id: string;
  min_quantity: number;
  max_quantity: number;
  sort_order: number;
  is_active: boolean;
}

interface PartnerData {
  roaster: {
    id: string;
    business_name: string;
    contact_name: string;
    email: string;
    country: string;
    city: string | null;
    is_active: boolean;
    is_ghost_roaster: boolean;
    ghost_roaster_approved_at: string | null;
    created_at: string;
  };
  territories: Territory[];
  rates: Rate[];
  orders: Order[];
  rateHistory: RateHistoryEntry[];
  brackets: Bracket[];
  customerPrices: CustomerPrice[];
  stats: {
    totalFulfilled: number;
    activeTerritories: number;
    slaCompliance: number | null;
  };
}

interface Territory {
  id: string;
  roaster_id: string;
  country_code: string;
  country_name: string;
  region: string | null;
  is_active: boolean;
  assigned_at: string;
}

interface Rate {
  id: string;
  roaster_id: string;
  bracket_id: string;
  bag_size: string;
  rate_per_bag: number;
  currency: string;
  is_active: boolean;
  negotiated_at: string;
  notes: string | null;
}

interface Order {
  id: string;
  order_number: string;
  bag_size: string;
  quantity: number;
  order_status: string;
  total_price: number;
  partner_rate_per_bag: number | null;
  partner_payout_total: number | null;
  created_at: string;
}

interface RateHistoryEntry {
  id: string;
  record_id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
}

interface CustomerPrice {
  bracket_id: string;
  bag_size: string;
  price_per_bag: number;
  currency: string;
}

function getBracketLabel(b: Bracket) {
  return `${b.min_quantity}–${b.max_quantity}`;
}

type Section = "territories" | "rates" | "margin" | "orders" | "history" | "notes";

const SECTIONS: { key: Section; label: string; icon: typeof Globe }[] = [
  { key: "territories", label: "Territories", icon: MapPin },
  { key: "rates", label: "Fulfilment Rates", icon: DollarSign },
  { key: "margin", label: "Margin Calculator", icon: TrendingUp },
  { key: "orders", label: "Fulfilment History", icon: Package },
  { key: "history", label: "Rate History", icon: History },
  { key: "notes", label: "Notes", icon: FileText },
];

// ── Main Component ──

export function AdminPartnerDetail({ roasterId }: { roasterId: string }) {
  const [data, setData] = useState<PartnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("territories");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/partners/${roasterId}`);
      if (!res.ok) throw new Error("Failed to load partner data");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [roasterId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        <span className="ml-2 text-slate-500">Loading partner...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4" />
          {error || "Partner not found"}
        </div>
      </div>
    );
  }

  const { roaster, stats } = data;
  const activeBrackets = data.brackets.filter((b) => b.is_active).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="p-6 md:p-8 max-w-7xl">
      {/* Back link */}
      <Link
        href="/admin/partner-program"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Partner Program
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{roaster.business_name}</h1>
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
              roaster.is_active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"
            }`}>
              {roaster.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {roaster.contact_name} &middot; {roaster.email}
            {roaster.city ? ` &middot; ${roaster.city}, ${roaster.country}` : ` &middot; ${roaster.country}`}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Partner since {roaster.ghost_roaster_approved_at
              ? new Date(roaster.ghost_roaster_approved_at).toLocaleDateString("en-GB")
              : new Date(roaster.created_at).toLocaleDateString("en-GB")}
          </p>
        </div>
        <Link
          href={`/admin/roasters/${roaster.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
        >
          View Full Roaster Record
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Territories" value={String(stats.activeTerritories)} />
        <StatCard label="Orders Fulfilled" value={String(stats.totalFulfilled)} />
        <StatCard
          label="SLA Compliance"
          value={stats.slaCompliance !== null ? `${stats.slaCompliance}%` : "—"}
        />
        <StatCard label="Rate Configs" value={String(data.rates.filter((r) => r.is_active).length)} />
      </div>

      {/* Section nav */}
      <div className="border-b border-slate-200 mb-6 overflow-x-auto">
        <div className="flex gap-4">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`flex items-center gap-1.5 pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeSection === s.key
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section content */}
      {activeSection === "territories" && (
        <TerritoriesSection
          territories={data.territories}
          roasterId={roasterId}
          onRefresh={fetchData}
        />
      )}
      {activeSection === "rates" && (
        <RatesSection
          rates={data.rates}
          brackets={activeBrackets}
          roasterId={roasterId}
          onRefresh={fetchData}
        />
      )}
      {activeSection === "margin" && (
        <MarginSection
          rates={data.rates}
          brackets={activeBrackets}
          customerPrices={data.customerPrices}
        />
      )}
      {activeSection === "orders" && (
        <OrdersSection orders={data.orders} />
      )}
      {activeSection === "history" && (
        <RateHistorySection history={data.rateHistory} rates={data.rates} brackets={activeBrackets} />
      )}
      {activeSection === "notes" && (
        <NotesSection roaster={roaster} />
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

// ── Section 1: Territories ──

function TerritoriesSection({
  territories,
  roasterId,
  onRefresh,
}: {
  territories: Territory[];
  roasterId: string;
  onRefresh: () => Promise<void>;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ country_code: "", country_name: "", region: "" });
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const active = territories.filter((t) => t.is_active);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/partners/${roasterId}/territories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country_code: addForm.country_code.toUpperCase(),
          country_name: addForm.country_name,
          region: addForm.region || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign");
      }
      setShowAdd(false);
      setAddForm({ country_code: "", country_name: "", region: "" });
      await onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(territoryId: string) {
    if (!confirm("Remove this territory assignment?")) return;
    setRemoving(territoryId);
    try {
      const res = await fetch(`/api/admin/partners/${roasterId}/territories/${territoryId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove");
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
        <h2 className="text-lg font-semibold text-slate-900">Assigned Territories</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          <Plus className="w-4 h-4" />
          Add Territory
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Country Code</label>
              <input type="text" required maxLength={2} placeholder="GB" value={addForm.country_code} onChange={(e) => setAddForm({ ...addForm, country_code: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm uppercase" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Country Name</label>
              <input type="text" required placeholder="United Kingdom" value={addForm.country_name} onChange={(e) => setAddForm({ ...addForm, country_name: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Region (optional)</label>
              <input type="text" placeholder="e.g. Scotland" value={addForm.region} onChange={(e) => setAddForm({ ...addForm, region: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Assign
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Country</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Region</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Code</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Assigned</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {active.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">No territories assigned.</td></tr>
            ) : (
              active.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{t.country_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{t.region || "— (entire country)"}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{t.country_code}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{new Date(t.assigned_at).toLocaleDateString("en-GB")}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleRemove(t.id)} disabled={removing === t.id} className="p-1.5 text-red-400 hover:text-red-600 rounded disabled:opacity-50" title="Remove territory">
                      {removing === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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

// ── Section 2: Fulfilment Rates (dynamic brackets) ──

function RatesSection({
  rates,
  brackets,
  roasterId,
  onRefresh,
}: {
  rates: Rate[];
  brackets: Bracket[];
  roasterId: string;
  onRefresh: () => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ bag_size: "", rates: {} as Record<string, string>, currency: "GBP" });

  const activeRates = rates.filter((r) => r.is_active);
  const bagSizes = Array.from(new Set(activeRates.map((r) => r.bag_size))).sort();

  function getRate(bracketId: string, bagSize: string): Rate | undefined {
    return activeRates.find((r) => r.bracket_id === bracketId && r.bag_size === bagSize);
  }

  async function saveRate(rateId: string, bracketId: string, bagSize: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/partners/${roasterId}/rates`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bracket_id: bracketId,
          bag_size: bagSize,
          rate_per_bag: parseFloat(editValue),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      setEditingId(null);
      setSaveSuccess(rateId);
      setTimeout(() => setSaveSuccess(null), 2000);
      await onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddBagSize(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      for (const bracket of brackets) {
        const val = addForm.rates[bracket.id];
        if (!val) continue;
        const res = await fetch(`/api/admin/partners/${roasterId}/rates`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bracket_id: bracket.id,
            bag_size: addForm.bag_size,
            rate_per_bag: parseFloat(val),
            currency: addForm.currency,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create rate");
        }
      }
      setShowAdd(false);
      setAddForm({ bag_size: "", rates: {}, currency: "GBP" });
      await onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Fulfilment Rates</h2>
          <p className="text-sm text-slate-500 mt-0.5">What you pay this partner per bag. Click a rate to edit.</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
          <Plus className="w-4 h-4" />
          Add Bag Size
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAddBagSize} className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Bag Size</label>
              <input type="text" required placeholder="e.g. 1kg" value={addForm.bag_size} onChange={(e) => setAddForm({ ...addForm, bag_size: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            {brackets.map((b) => (
              <div key={b.id}>
                <label className="block text-xs font-medium text-slate-700 mb-1">{getBracketLabel(b)}</label>
                <input type="number" step="0.01" min="0" required value={addForm.rates[b.id] || ""} onChange={(e) => setAddForm({ ...addForm, rates: { ...addForm.rates, [b.id]: e.target.value } })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Currency</label>
              <select value={addForm.currency} onChange={(e) => setAddForm({ ...addForm, currency: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="GBP">GBP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="AUD">AUD</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Rates
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Bag Size</th>
              {brackets.map((b) => (
                <th key={b.id} className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                  {getBracketLabel(b)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bagSizes.length === 0 ? (
              <tr><td colSpan={brackets.length + 1} className="px-4 py-8 text-center text-sm text-slate-500">No rates configured yet.</td></tr>
            ) : (
              bagSizes.map((size) => (
                <tr key={size} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{size}</td>
                  {brackets.map((b) => {
                    const rate = getRate(b.id, size);
                    const isEditing = editingId === rate?.id;
                    const isSuccess = saveSuccess === rate?.id;
                    return (
                      <td key={b.id} className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <input type="number" step="0.01" min="0" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-20 px-2 py-1 text-sm text-right border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-500" autoFocus />
                            <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                            <button onClick={() => rate && saveRate(rate.id, b.id, size)} disabled={saving} className="p-1 text-brand-600 hover:text-brand-700 disabled:opacity-50">
                              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ) : isSuccess ? (
                          <Check className="w-4 h-4 text-green-600 inline" />
                        ) : rate ? (
                          <button onClick={() => { setEditingId(rate.id); setEditValue(String(rate.rate_per_bag)); }} className="text-sm text-slate-700 hover:text-brand-700" title="Click to edit">
                            {rate.currency === "GBP" ? "£" : `${rate.currency} `}{Number(rate.rate_per_bag).toFixed(2)}
                          </button>
                        ) : (
                          <span className="text-sm text-slate-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section 3: Margin Calculator (dynamic brackets) ──

function MarginSection({
  rates,
  brackets,
  customerPrices,
}: {
  rates: Rate[];
  brackets: Bracket[];
  customerPrices: CustomerPrice[];
}) {
  const activeRates = rates.filter((r) => r.is_active);
  const MARGIN_WARN_THRESHOLD = 20;
  const bagSizes = Array.from(new Set(activeRates.map((r) => r.bag_size))).sort();

  if (activeRates.length === 0 || customerPrices.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <TrendingUp className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">
          {activeRates.length === 0
            ? "Configure partner rates first to see margin calculations."
            : "No customer pricing configured."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Margin Calculator</h2>

      {bagSizes.map((bagSize) => (
        <div key={bagSize} className="mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">{bagSize}</h3>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Bracket</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Customer Pays</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Partner Rate</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Your Margin</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {brackets.map((bracket) => {
                  const cp = customerPrices.find((p) => p.bracket_id === bracket.id && p.bag_size === bagSize);
                  const pr = activeRates.find((r) => r.bracket_id === bracket.id && r.bag_size === bagSize);
                  const customerPrice = cp ? Number(cp.price_per_bag) : null;
                  const partnerPrice = pr ? Number(pr.rate_per_bag) : null;
                  const margin = customerPrice !== null && partnerPrice !== null ? customerPrice - partnerPrice : null;
                  const marginPct = customerPrice && customerPrice > 0 && margin !== null ? (margin / customerPrice) * 100 : null;
                  const isLow = marginPct !== null && marginPct < MARGIN_WARN_THRESHOLD;

                  return (
                    <tr key={bracket.id} className={isLow ? "bg-amber-50" : "hover:bg-slate-50"}>
                      <td className="px-4 py-3 text-sm text-slate-700">{getBracketLabel(bracket)}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700">
                        {customerPrice !== null ? `£${customerPrice.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700">
                        {partnerPrice !== null ? `£${partnerPrice.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {margin !== null ? (
                          <span className={margin >= 0 ? "text-green-700" : "text-red-700"}>
                            £{margin.toFixed(2)}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {marginPct !== null ? (
                          <span className={isLow ? "text-amber-700" : marginPct >= 0 ? "text-green-700" : "text-red-700"}>
                            {marginPct.toFixed(0)}%
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Section 4: Fulfilment History ──

function OrdersSection({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <Package className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">No orders fulfilled by this partner yet.</p>
      </div>
    );
  }

  const thisMonth = orders.filter((o) => {
    const d = new Date(o.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const monthPayout = thisMonth.reduce((sum, o) => sum + (o.partner_payout_total || 0), 0);

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCard label="This Month Orders" value={String(thisMonth.length)} />
        <StatCard label="This Month Payout" value={`£${monthPayout.toFixed(2)}`} />
        <StatCard label="Total Orders" value={String(orders.length)} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Order</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Bag Size</th>
              <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Qty</th>
              <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Rate/bag</th>
              <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Payout</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-medium text-brand-700">{o.order_number}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{o.bag_size}</td>
                <td className="px-4 py-3 text-sm text-right text-slate-700">{o.quantity}</td>
                <td className="px-4 py-3 text-sm text-right text-slate-700">
                  {o.partner_rate_per_bag !== null ? `£${Number(o.partner_rate_per_bag).toFixed(2)}` : "—"}
                </td>
                <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                  {o.partner_payout_total !== null ? `£${Number(o.partner_payout_total).toFixed(2)}` : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                    o.order_status === "Delivered" ? "bg-green-50 text-green-700"
                    : o.order_status === "Dispatched" ? "bg-blue-50 text-blue-700"
                    : "bg-amber-50 text-amber-700"
                  }`}>
                    {o.order_status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {new Date(o.created_at).toLocaleDateString("en-GB")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section 5: Rate Change History ──

function RateHistorySection({
  history,
  rates,
  brackets,
}: {
  history: RateHistoryEntry[];
  rates: Rate[];
  brackets: Bracket[];
}) {
  const rateMap = new Map(rates.map((r) => {
    const bracket = brackets.find((b) => b.id === r.bracket_id);
    return [r.id, `${r.bag_size} (${bracket ? getBracketLabel(bracket) : "?"})`];
  }));

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <History className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">No rate changes recorded yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Rate Change History</h2>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Date</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Rate</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Field</th>
              <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Old</th>
              <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">New</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.map((entry) => (
              <tr key={entry.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-500">
                  {new Date(entry.changed_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-slate-900">
                  {rateMap.get(entry.record_id) || "Unknown"}
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">{entry.field_changed}</td>
                <td className="px-4 py-3 text-sm text-right text-red-600">
                  {entry.old_value != null ? `£${Number(entry.old_value).toFixed(2)}` : "—"}
                </td>
                <td className="px-4 py-3 text-sm text-right text-green-600">
                  {entry.new_value != null ? `£${Number(entry.new_value).toFixed(2)}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section 6: Notes ──

function NotesSection({ roaster }: { roaster: { id: string; business_name: string } }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Internal Notes</h2>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <p className="text-sm text-slate-500">
          Partner notes for {roaster.business_name}. Use the{" "}
          <Link href={`/admin/roasters/${roaster.id}`} className="text-brand-700 hover:underline">
            full roaster record
          </Link>{" "}
          to manage notes and activity history.
        </p>
      </div>
    </div>
  );
}
