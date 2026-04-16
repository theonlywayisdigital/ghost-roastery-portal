"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Truck,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Package,
} from "@/components/icons";
import { SettingsHeader } from "@/components/SettingsHeader";

const DISPATCH_TIME_OPTIONS = [
  { value: "same_day", label: "Same day" },
  { value: "1_business_day", label: "1 business day" },
  { value: "2_business_days", label: "2 business days" },
  { value: "3_business_days", label: "3 business days" },
  { value: "5_business_days", label: "5 business days" },
];

const CUTOFF_OPTIONS = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
];

const DAY_OPTIONS = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
];

interface ShippingMethod {
  id: string;
  name: string;
  price: number;
  free_threshold: number | null;
  estimated_days: string | null;
  max_weight_kg: number | null;
  is_active: boolean;
  sort_order: number;
}

export function ShippingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dispatch settings
  const [dispatchTime, setDispatchTime] = useState("2_business_days");
  const [cutoffTime, setCutoffTime] = useState("14:00");
  const [dispatchDays, setDispatchDays] = useState<string[]>(["mon", "tue", "wed", "thu", "fri"]);

  // Shipping methods
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [editingMethod, setEditingMethod] = useState<Partial<ShippingMethod> | null>(null);
  const [savingMethod, setSavingMethod] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, methodsRes] = await Promise.all([
        fetch("/api/settings/shipping"),
        fetch("/api/settings/shipping/methods"),
      ]);
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setDispatchTime(settings.default_dispatch_time);
        setCutoffTime(settings.dispatch_cutoff_time);
        setDispatchDays(settings.dispatch_days);
      }
      if (methodsRes.ok) {
        const data = await methodsRes.json();
        setMethods(data.methods);
      }
    } catch (err) {
      console.error("Failed to load shipping data:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function toggleDay(day: string) {
    setDispatchDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSaveDispatch() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/settings/shipping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          default_dispatch_time: dispatchTime,
          dispatch_cutoff_time: cutoffTime,
          dispatch_days: dispatchDays,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const json = await res.json();
        setError(json.error || "Failed to save");
      }
    } catch {
      setError("Failed to save dispatch settings");
    }
    setSaving(false);
  }

  async function handleSaveMethod() {
    if (!editingMethod?.name?.trim()) return;
    setSavingMethod(true);

    try {
      const isNew = !editingMethod.id;
      const url = isNew
        ? "/api/settings/shipping/methods"
        : `/api/settings/shipping/methods/${editingMethod.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingMethod.name,
          price: editingMethod.price ?? 0,
          free_threshold: editingMethod.free_threshold || null,
          estimated_days: editingMethod.estimated_days || null,
          max_weight_kg: editingMethod.max_weight_kg ?? null,
          is_active: editingMethod.is_active ?? true,
        }),
      });

      if (res.ok) {
        setEditingMethod(null);
        // Reload methods
        const methodsRes = await fetch("/api/settings/shipping/methods");
        if (methodsRes.ok) {
          const data = await methodsRes.json();
          setMethods(data.methods);
        }
      }
    } catch {
      setError("Failed to save shipping method");
    }
    setSavingMethod(false);
  }

  async function handleDeleteMethod(id: string) {
    try {
      const res = await fetch(`/api/settings/shipping/methods/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMethods((prev) => prev.filter((m) => m.id !== id));
      }
    } catch {
      setError("Failed to delete shipping method");
    }
  }

  async function handleToggleMethod(id: string, is_active: boolean) {
    try {
      const method = methods.find((m) => m.id === id);
      if (!method) return;
      await fetch(`/api/settings/shipping/methods/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...method, is_active }),
      });
      setMethods((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_active } : m))
      );
    } catch {
      setError("Failed to update shipping method");
    }
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Shipping</h1>
          <p className="text-slate-500 mt-1">Configure how you dispatch and ship orders.</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <SettingsHeader
        title="Shipping"
        description="Configure how you dispatch and ship orders."
        breadcrumb="Shipping"
      />

      <div className="space-y-6">
        {/* ─── Section 1: Dispatch Settings ─── */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Dispatch Settings</h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Set your typical dispatch timeframe and working days.
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Default Dispatch Time
                </label>
                <select
                  value={dispatchTime}
                  onChange={(e) => setDispatchTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  {DISPATCH_TIME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Cut-off Time
                </label>
                <select
                  value={cutoffTime}
                  onChange={(e) => setCutoffTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  {CUTOFF_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Orders placed before this time may be dispatched the same/next day.
                </p>
              </div>
            </div>

            <div className="mt-6 max-w-2xl">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Dispatch Days
              </label>
              <div className="flex flex-wrap gap-2">
                {DAY_OPTIONS.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => toggleDay(day.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                      dispatchDays.includes(day.value)
                        ? "bg-brand-50 border-brand-300 text-brand-700"
                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleSaveDispatch}
                disabled={saving}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Dispatch Settings"}
              </button>
              {saved && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Saved
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ─── Section 2: Shipping Methods ─── */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Shipping Methods</h2>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  The shipping options available to customers at checkout.
                </p>
              </div>
              <button
                onClick={() =>
                  setEditingMethod({
                    name: "",
                    price: 0,
                    free_threshold: null,
                    estimated_days: "",
                    max_weight_kg: null,
                    is_active: true,
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Method
              </button>
            </div>
          </div>
          <div className="p-6">
            {methods.length === 0 && !editingMethod ? (
              <div className="text-center py-8">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                  No shipping methods configured. Add your first method to enable shipping.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {methods.map((method) => (
                  <div
                    key={method.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      method.is_active
                        ? "border-slate-200 bg-white"
                        : "border-slate-100 bg-slate-50 opacity-60"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">{method.name}</p>
                        {!method.is_active && (
                          <span className="text-xs px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>{`\u00A3${Number(method.price).toFixed(2)}`}</span>
                        {method.free_threshold && (
                          <span>{`Free over \u00A3${Number(method.free_threshold).toFixed(2)}`}</span>
                        )}
                        {method.estimated_days && (
                          <span>{`${method.estimated_days} days`}</span>
                        )}
                        <span>{method.max_weight_kg != null ? `Up to ${Number(method.max_weight_kg)}kg` : "No weight limit"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleMethod(method.id, !method.is_active)}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                          method.is_active ? "bg-brand-600" : "bg-slate-200"
                        }`}
                        role="switch"
                        aria-checked={method.is_active}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                            method.is_active ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => setEditingMethod(method)}
                        className="p-1.5 text-slate-400 hover:text-slate-600"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMethod(method.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Edit/Add Modal */}
            {editingMethod && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {editingMethod.id ? "Edit Shipping Method" : "Add Shipping Method"}
                    </h3>
                    <button
                      onClick={() => setEditingMethod(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Name
                      </label>
                      <input
                        type="text"
                        value={editingMethod.name || ""}
                        onChange={(e) =>
                          setEditingMethod((prev) => prev ? { ...prev, name: e.target.value } : null)
                        }
                        placeholder='e.g. "Royal Mail Tracked 48"'
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Price
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                            {"\u00A3"}
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editingMethod.price ?? 0}
                            onChange={(e) =>
                              setEditingMethod((prev) =>
                                prev ? { ...prev, price: parseFloat(e.target.value) || 0 } : null
                              )
                            }
                            className="w-full pl-7 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Free Over
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                            {"\u00A3"}
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editingMethod.free_threshold ?? ""}
                            onChange={(e) =>
                              setEditingMethod((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      free_threshold: e.target.value
                                        ? parseFloat(e.target.value)
                                        : null,
                                    }
                                  : null
                              )
                            }
                            placeholder="Optional"
                            className="w-full pl-7 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Estimated Delivery Days
                        </label>
                        <input
                          type="text"
                          value={editingMethod.estimated_days || ""}
                          onChange={(e) =>
                            setEditingMethod((prev) =>
                              prev ? { ...prev, estimated_days: e.target.value } : null
                            )
                          }
                          placeholder='e.g. "2-3"'
                          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Max weight (kg)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={editingMethod.max_weight_kg ?? ""}
                          onChange={(e) =>
                            setEditingMethod((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    max_weight_kg: e.target.value
                                      ? parseFloat(e.target.value)
                                      : null,
                                  }
                                : null
                            )
                          }
                          placeholder="No limit"
                          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <p className="text-xs text-slate-400 mt-1">
                          Orders heavier than this won&apos;t see this option. Leave blank for no limit.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setEditingMethod(null)}
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveMethod}
                      disabled={savingMethod || !editingMethod.name?.trim()}
                      className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                    >
                      {savingMethod ? "Saving..." : editingMethod.id ? "Update" : "Add"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
