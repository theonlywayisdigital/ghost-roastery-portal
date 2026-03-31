"use client";

import { useState, useEffect, useMemo } from "react";
import { Flame, Plus, Check, X, ChevronDown, ChevronUp, Star } from "@/components/icons";

interface GreenBeanOption {
  id: string;
  name: string;
  current_stock_kg: number;
}

interface RoastedStockOption {
  id: string;
  name: string;
  green_bean_id: string | null;
  current_stock_kg: number;
}

interface QuickRoastModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedBeanId?: string;
  preselectedStockId?: string;
}

const ROAST_LEVELS = ["Light", "Medium-Light", "Medium", "Medium-Dark", "Dark"];

export function QuickRoastModal({ open, onClose, onSuccess, preselectedBeanId, preselectedStockId }: QuickRoastModalProps) {
  const [beans, setBeans] = useState<GreenBeanOption[]>([]);
  const [stocks, setStocks] = useState<RoastedStockOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Essential fields
  const [greenBeanId, setGreenBeanId] = useState(preselectedBeanId || "");
  const [greenWeight, setGreenWeight] = useState("");
  const [roastedWeight, setRoastedWeight] = useState("");
  const [roastLevel, setRoastLevel] = useState("");

  // Stock output
  const [addToStock, setAddToStock] = useState(true);
  const [selectedStockId, setSelectedStockId] = useState(preselectedStockId || "");
  const [createNewStock, setCreateNewStock] = useState(false);
  const [newStockName, setNewStockName] = useState("");
  const [stockQty, setStockQty] = useState("");

  // More details (collapsed by default)
  const [showDetails, setShowDetails] = useState(false);
  const [batchNumber, setBatchNumber] = useState("");
  const [roastDate, setRoastDate] = useState(new Date().toISOString().split("T")[0]);
  const [roastTime, setRoastTime] = useState("");
  const [chargeTemp, setChargeTemp] = useState("");
  const [dropTemp, setDropTemp] = useState("");
  const [firstCrackTime, setFirstCrackTime] = useState("");
  const [firstCrackTemp, setFirstCrackTemp] = useState("");
  const [machine, setMachine] = useState("");
  const [operator, setOperator] = useState("");
  const [qualityRating, setQualityRating] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successState, setSuccessState] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/tools/inventory/quick-data")
      .then((r) => r.json())
      .then((d) => {
        setBeans(d.greenBeans || []);
        setStocks(d.roastedStocks || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (open) {
      if (preselectedBeanId) setGreenBeanId(preselectedBeanId);
      if (preselectedStockId) setSelectedStockId(preselectedStockId);
    }
  }, [open, preselectedBeanId, preselectedStockId]);

  // Auto-fill stock qty from roasted weight
  useEffect(() => {
    if (addToStock && roastedWeight && !stockQty) {
      setStockQty(roastedWeight);
    }
  }, [roastedWeight, addToStock, stockQty]);

  const weightLossPercent = useMemo(() => {
    const g = parseFloat(greenWeight);
    const r = parseFloat(roastedWeight);
    if (!g || !r || g <= 0) return null;
    return ((g - r) / g * 100).toFixed(1);
  }, [greenWeight, roastedWeight]);

  // Filter stocks to show linked ones first
  const sortedStocks = useMemo(() => {
    if (!greenBeanId) return stocks;
    const linked = stocks.filter((s) => s.green_bean_id === greenBeanId);
    const unlinked = stocks.filter((s) => s.green_bean_id !== greenBeanId);
    return [...linked, ...unlinked];
  }, [stocks, greenBeanId]);

  const selectedBean = beans.find((b) => b.id === greenBeanId);

  function resetForm() {
    setGreenBeanId(preselectedBeanId || "");
    setGreenWeight("");
    setRoastedWeight("");
    setRoastLevel("");
    setAddToStock(true);
    setSelectedStockId(preselectedStockId || "");
    setCreateNewStock(false);
    setNewStockName("");
    setStockQty("");
    setShowDetails(false);
    setBatchNumber("");
    setRoastDate(new Date().toISOString().split("T")[0]);
    setRoastTime("");
    setChargeTemp("");
    setDropTemp("");
    setFirstCrackTime("");
    setFirstCrackTemp("");
    setMachine("");
    setOperator("");
    setQualityRating("");
    setNotes("");
    setError(null);
    setSuccessState(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleLogAnother() {
    // Keep bean and stock selection, reset everything else
    const keepBeanId = greenBeanId;
    const keepStockId = selectedStockId;
    resetForm();
    setGreenBeanId(keepBeanId);
    setSelectedStockId(keepStockId);
    // Refresh data for updated stock levels
    fetch("/api/tools/inventory/quick-data")
      .then((r) => r.json())
      .then((d) => {
        setBeans(d.greenBeans || []);
        setStocks(d.roastedStocks || []);
      });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // If creating new roasted stock record
    let finalStockId = selectedStockId;
    if (addToStock && createNewStock && newStockName) {
      const createRes = await fetch("/api/tools/roasted-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStockName,
          green_bean_id: greenBeanId || null,
        }),
      });
      if (!createRes.ok) {
        setError("Failed to create roasted stock record");
        setSaving(false);
        return;
      }
      const createData = await createRes.json();
      finalStockId = createData.roastedStock.id;
    }

    const payload: Record<string, unknown> = {
      roast_date: roastDate,
      roast_number: batchNumber || null,
      green_bean_id: greenBeanId || null,
      green_bean_name: selectedBean?.name || null,
      green_weight_kg: greenWeight || null,
      roasted_weight_kg: roastedWeight || null,
      roast_level: roastLevel || null,
      roast_time_seconds: roastTime || null,
      charge_temp_c: chargeTemp || null,
      drop_temp_c: dropTemp || null,
      first_crack_time_seconds: firstCrackTime || null,
      first_crack_temp_c: firstCrackTemp || null,
      roaster_machine: machine || null,
      operator: operator || null,
      quality_rating: qualityRating || null,
      notes: notes || null,
      status: "completed",
    };

    if (addToStock && finalStockId && stockQty) {
      payload.roasted_stock_id = finalStockId;
      payload.roasted_stock_qty_kg = stockQty;
    }

    const res = await fetch("/api/tools/roast-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to log roast");
      setSaving(false);
      return;
    }

    setSaving(false);
    setSuccessState(true);
    onSuccess();
  }

  if (!open) return null;

  const inputClass = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500";
  const labelClass = "text-xs text-slate-500 font-medium";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />
      <div className="relative bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Flame className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Log Roast</h3>
          </div>
          <button onClick={handleClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4 ml-[46px]">Record a completed roast batch.</p>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        {successState ? (
          <div className="py-6 text-center">
            <div className="flex items-center justify-center gap-2 text-green-600 mb-4">
              <Check className="w-5 h-5" />
              <span className="font-medium">Roast logged successfully</span>
            </div>
            {greenWeight && roastedWeight && (
              <p className="text-sm text-slate-500 mb-4">
                {greenWeight} kg green → {roastedWeight} kg roasted ({weightLossPercent}% loss)
              </p>
            )}
            <div className="flex justify-center gap-3">
              <button
                onClick={handleLogAnother}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                Log Another Roast
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="py-8 text-center text-sm text-slate-400">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Essential fields */}
            <div>
              <label className={labelClass}>Green Bean</label>
              <select
                value={greenBeanId}
                onChange={(e) => setGreenBeanId(e.target.value)}
                className={`${inputClass} mt-1 ${greenBeanId ? "" : "text-slate-400"}`}
              >
                <option value="">Select bean</option>
                {beans.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({Number(b.current_stock_kg).toFixed(2)} kg)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Green Weight (kg) *</label>
                <input
                  type="number"
                  value={greenWeight}
                  onChange={(e) => setGreenWeight(e.target.value)}
                  className={`${inputClass} mt-1`}
                  min="0.001"
                  step="0.001"
                  required
                  autoFocus
                  placeholder="e.g. 12"
                />
                {selectedBean && greenWeight && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Remaining: {Math.max(0, Number(selectedBean.current_stock_kg) - parseFloat(greenWeight || "0")).toFixed(2)} kg
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>Roasted Weight (kg) *</label>
                <input
                  type="number"
                  value={roastedWeight}
                  onChange={(e) => {
                    setRoastedWeight(e.target.value);
                    if (addToStock) setStockQty(e.target.value);
                  }}
                  className={`${inputClass} mt-1`}
                  min="0.001"
                  step="0.001"
                  required
                  placeholder="e.g. 10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Weight Loss</label>
                <div className="mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium">
                  {weightLossPercent != null ? `${weightLossPercent}%` : "--"}
                </div>
              </div>
              <div>
                <label className={labelClass}>Roast Level</label>
                <select
                  value={roastLevel}
                  onChange={(e) => setRoastLevel(e.target.value)}
                  className={`${inputClass} mt-1 ${roastLevel ? "" : "text-slate-400"}`}
                >
                  <option value="">Select level</option>
                  {ROAST_LEVELS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stock output section */}
            <div className="border border-slate-200 rounded-lg p-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addToStock}
                  onChange={(e) => setAddToStock(e.target.checked)}
                  className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
                />
                <span className="text-sm font-medium text-slate-700">Add to Roasted Stock</span>
              </label>

              {addToStock && (
                <div className="space-y-3 pl-7">
                  {!createNewStock ? (
                    <div className="space-y-2">
                      <select
                        value={selectedStockId}
                        onChange={(e) => setSelectedStockId(e.target.value)}
                        className={`${inputClass} ${selectedStockId ? "" : "text-slate-400"}`}
                      >
                        <option value="">Select stock record</option>
                        {sortedStocks.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({Number(s.current_stock_kg).toFixed(2)} kg)
                            {s.green_bean_id === greenBeanId && greenBeanId ? " ★" : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => { setCreateNewStock(true); setSelectedStockId(""); }}
                        className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create new stock record
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newStockName}
                        onChange={(e) => setNewStockName(e.target.value)}
                        className={inputClass}
                        placeholder="e.g. Ethiopia Yirgacheffe (Roasted)"
                      />
                      <button
                        type="button"
                        onClick={() => { setCreateNewStock(false); setNewStockName(""); }}
                        className="text-sm text-slate-500 hover:text-slate-700"
                      >
                        Use existing record instead
                      </button>
                    </div>
                  )}
                  <div>
                    <label className={labelClass}>Quantity to add (kg)</label>
                    <input
                      type="number"
                      value={stockQty}
                      onChange={(e) => setStockQty(e.target.value)}
                      className={`${inputClass} mt-1`}
                      min="0.001"
                      step="0.001"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Expandable details */}
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 font-medium w-full"
            >
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              More details
              {(batchNumber || roastTime || chargeTemp || qualityRating) && (
                <span className="text-xs text-brand-600 ml-auto">
                  {[batchNumber && `#${batchNumber}`, roastTime && `${roastTime}s`, chargeTemp && `${chargeTemp}°C`, qualityRating && `${qualityRating}★`].filter(Boolean).join(", ")}
                </span>
              )}
            </button>

            {showDetails && (
              <div className="space-y-3 border border-slate-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Batch Number</label>
                    <input type="text" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} className={`${inputClass} mt-1`} placeholder="e.g. B-001" />
                  </div>
                  <div>
                    <label className={labelClass}>Roast Date</label>
                    <input type="date" value={roastDate} onChange={(e) => setRoastDate(e.target.value)} className={`${inputClass} mt-1`} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Roast Time (s)</label>
                    <input type="number" value={roastTime} onChange={(e) => setRoastTime(e.target.value)} className={`${inputClass} mt-1`} min="0" placeholder="720" />
                  </div>
                  <div>
                    <label className={labelClass}>Charge Temp ({"\u00B0"}C)</label>
                    <input type="number" value={chargeTemp} onChange={(e) => setChargeTemp(e.target.value)} className={`${inputClass} mt-1`} step="0.1" placeholder="200" />
                  </div>
                  <div>
                    <label className={labelClass}>Drop Temp ({"\u00B0"}C)</label>
                    <input type="number" value={dropTemp} onChange={(e) => setDropTemp(e.target.value)} className={`${inputClass} mt-1`} step="0.1" placeholder="210" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>1st Crack Time (s)</label>
                    <input type="number" value={firstCrackTime} onChange={(e) => setFirstCrackTime(e.target.value)} className={`${inputClass} mt-1`} min="0" placeholder="540" />
                  </div>
                  <div>
                    <label className={labelClass}>1st Crack Temp ({"\u00B0"}C)</label>
                    <input type="number" value={firstCrackTemp} onChange={(e) => setFirstCrackTemp(e.target.value)} className={`${inputClass} mt-1`} step="0.1" placeholder="196" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Machine</label>
                    <input type="text" value={machine} onChange={(e) => setMachine(e.target.value)} className={`${inputClass} mt-1`} placeholder="e.g. Probat P12" />
                  </div>
                  <div>
                    <label className={labelClass}>Operator</label>
                    <input type="text" value={operator} onChange={(e) => setOperator(e.target.value)} className={`${inputClass} mt-1`} placeholder="e.g. John" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Rating</label>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setQualityRating(qualityRating === String(star) ? "" : String(star))}
                        className="p-0.5 rounded hover:bg-slate-100 transition-colors"
                      >
                        <Star className={`w-5 h-5 ${Number(qualityRating) >= star ? "text-amber-400" : "text-slate-200"}`} />
                      </button>
                    ))}
                    {qualityRating && <span className="ml-1 text-xs text-slate-500">{qualityRating}/5</span>}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Notes</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${inputClass} mt-1`} placeholder="Any observations..." />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={handleClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !greenWeight || !roastedWeight}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                <Flame className="w-4 h-4" />
                {saving ? "Saving..." : "Log Roast"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
