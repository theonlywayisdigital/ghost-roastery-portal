"use client";

import { useState, useEffect } from "react";
import { Package, Plus, Check, X } from "@/components/icons";

interface GreenBeanOption {
  id: string;
  name: string;
  current_stock_kg: number;
  cost_per_kg: number | null;
}

interface QuickReceiveModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedBeanId?: string;
  /** Called when purchase unit_cost differs from bean's cost_per_kg */
  onCostDifference?: (beanId: string, beanName: string, unitCost: number, currentCost: number | null) => void;
}

export function QuickReceiveModal({ open, onClose, onSuccess, preselectedBeanId, onCostDifference }: QuickReceiveModalProps) {
  const [beans, setBeans] = useState<GreenBeanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"existing" | "new">("existing");

  // Existing bean mode
  const [selectedBeanId, setSelectedBeanId] = useState(preselectedBeanId || "");
  const [quantity, setQuantity] = useState("");
  const [costPerKg, setCostPerKg] = useState("");
  const [notes, setNotes] = useState("");

  // New bean mode
  const [newName, setNewName] = useState("");
  const [newOrigin, setNewOrigin] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newCostPerKg, setNewCostPerKg] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/tools/inventory/quick-data")
      .then((r) => r.json())
      .then((d) => {
        setBeans(d.greenBeans || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (open && preselectedBeanId) {
      setSelectedBeanId(preselectedBeanId);
      setMode("existing");
    }
  }, [open, preselectedBeanId]);

  function resetForm() {
    setSelectedBeanId(preselectedBeanId || "");
    setQuantity("");
    setCostPerKg("");
    setNotes("");
    setNewName("");
    setNewOrigin("");
    setNewQuantity("");
    setNewCostPerKg("");
    setError(null);
    setSuccess(false);
    setMode("existing");
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmitExisting(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBeanId || !quantity) return;
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/tools/green-beans/${selectedBeanId}/movements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        movement_type: "purchase",
        quantity_kg: quantity,
        unit_cost: costPerKg || null,
        notes: notes || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to record stock");
      setSaving(false);
      return;
    }

    setSaving(false);
    setSuccess(true);

    // Check if the purchase unit cost differs from the bean's stored cost
    const unitCostNum = costPerKg ? parseFloat(costPerKg) : null;
    const beanCost = selectedBean?.cost_per_kg ?? null;
    const costsDiffer =
      unitCostNum != null &&
      unitCostNum > 0 &&
      beanCost != null &&
      beanCost > 0 &&
      Math.abs(unitCostNum - beanCost) >= 0.01;

    setTimeout(() => {
      onSuccess();
      handleClose();
      if (costsDiffer && onCostDifference && selectedBean) {
        onCostDifference(selectedBean.id, selectedBean.name, unitCostNum!, beanCost);
      }
    }, 800);
  }

  async function handleSubmitNew(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);

    const res = await fetch("/api/tools/green-beans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        origin_country: newOrigin || "",
        current_stock_kg: newQuantity || "0",
        cost_per_kg: newCostPerKg || "",
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create bean");
      setSaving(false);
      return;
    }

    setSaving(false);
    setSuccess(true);
    setTimeout(() => {
      onSuccess();
      handleClose();
    }, 800);
  }

  if (!open) return null;

  const selectedBean = beans.find((b) => b.id === selectedBeanId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />
      <div className="relative bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-green-50 rounded-lg">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Receive Beans</h3>
          </div>
          <button onClick={handleClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4 ml-[46px]">Record a green bean delivery.</p>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        {success ? (
          <div className="flex items-center justify-center gap-2 py-8 text-green-600">
            <Check className="w-5 h-5" />
            <span className="font-medium">Stock updated</span>
          </div>
        ) : loading ? (
          <div className="py-8 text-center text-sm text-slate-400">Loading...</div>
        ) : (
          <>
            {/* Mode toggle */}
            <div className="flex gap-1 mb-4 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setMode("existing")}
                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  mode === "existing" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Existing Bean
              </button>
              <button
                type="button"
                onClick={() => setMode("new")}
                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  mode === "new" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                New Bean
              </button>
            </div>

            {mode === "existing" ? (
              <form onSubmit={handleSubmitExisting} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 font-medium">Green Bean</label>
                  <select
                    value={selectedBeanId}
                    onChange={(e) => setSelectedBeanId(e.target.value)}
                    className={`w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${selectedBeanId ? "text-slate-900" : "text-slate-400"}`}
                  >
                    <option value="">Select bean</option>
                    {beans.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({Number(b.current_stock_kg).toFixed(2)} kg)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium">Quantity Received (kg) *</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    min="0.001"
                    step="0.001"
                    required
                    autoFocus
                    placeholder="e.g. 30"
                  />
                  {selectedBean && quantity && (
                    <p className="text-xs text-slate-500 mt-1">
                      New balance: {(Number(selectedBean.current_stock_kg) + parseFloat(quantity || "0")).toFixed(2)} kg
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium">Cost per kg (optional)</label>
                  <input
                    type="number"
                    value={costPerKg}
                    onChange={(e) => setCostPerKg(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 8.50"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium">Notes (optional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="e.g. From DHL delivery"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={handleClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !selectedBeanId || !quantity}
                    className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    {saving ? "Saving..." : "Receive Stock"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmitNew} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 font-medium">Name *</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="e.g. Ethiopia Yirgacheffe Grade 1"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium">Origin Country</label>
                  <input
                    type="text"
                    value={newOrigin}
                    onChange={(e) => setNewOrigin(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="e.g. Ethiopia"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium">Quantity (kg)</label>
                  <input
                    type="number"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    min="0"
                    step="0.001"
                    placeholder="e.g. 30"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium">Cost per kg</label>
                  <input
                    type="number"
                    value={newCostPerKg}
                    onChange={(e) => setNewCostPerKg(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 8.50"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={handleClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !newName.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    {saving ? "Creating..." : "Create & Receive"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
