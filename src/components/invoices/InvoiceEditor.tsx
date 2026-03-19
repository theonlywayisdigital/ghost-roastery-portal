"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  Loader2,
  Plus,
  Trash2,
  Save,
  Send,
} from "@/components/icons";

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface InvoiceInitialData {
  customerName?: string;
  customerEmail?: string;
  customerBusiness?: string;
  lineItems?: LineItem[];
  orderIds?: string[];
  dueDays?: number;
  paymentMethod?: string;
  notes?: string;
}

interface InvoiceEditorProps {
  ownerType: "ghost_roastery" | "roaster";
  backHref: string;
  successHref: string;
  initialData?: InvoiceInitialData;
  invoiceId?: string;
  mode?: "create" | "edit";
}

export function InvoiceEditor({
  backHref,
  successHref,
  initialData,
  invoiceId,
  mode = "create",
}: InvoiceEditorProps) {
  const router = useRouter();

  // Customer
  const [customerSearch, setCustomerSearch] = useState(
    initialData?.customerName || initialData?.customerEmail || ""
  );
  const [customerId] = useState<string | null>(null);
  const [businessId] = useState<string | null>(null);

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>(
    initialData?.lineItems && initialData.lineItems.length > 0
      ? initialData.lineItems
      : [{ description: "", quantity: 1, unit_price: 0 }]
  );

  // Settings
  const [dueDays, setDueDays] = useState(initialData?.dueDays ?? 30);
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [internalNotes, setInternalNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(
    initialData?.paymentMethod || "invoice_offline"
  );

  // State
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(mode === "edit");

  // Load existing invoice data in edit mode
  useEffect(() => {
    if (mode !== "edit" || !invoiceId) return;
    (async () => {
      try {
        const res = await fetch(`/api/invoices/${invoiceId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.customer_name || data.customer_email) {
          setCustomerSearch(data.customer_name || data.customer_email || "");
        }
        if (data.line_items?.length) {
          setLineItems(
            data.line_items.map((li: { description: string; quantity: number; unit_price: number }) => ({
              description: li.description || "",
              quantity: li.quantity || 1,
              unit_price: li.unit_price || 0,
            }))
          );
        }
        if (data.due_days != null) setDueDays(data.due_days);
        if (data.tax_rate != null) setTaxRate(data.tax_rate);
        if (data.notes) setNotes(data.notes);
        if (data.internal_notes) setInternalNotes(data.internal_notes);
        if (data.payment_method) setPaymentMethod(data.payment_method);
      } catch {
        console.error("Failed to load invoice for editing");
      } finally {
        setLoadingInvoice(false);
      }
    })();
  }, [mode, invoiceId]);

  function addLineItem() {
    setLineItems([...lineItems, { description: "", quantity: 1, unit_price: 0 }]);
  }

  function removeLineItem(index: number) {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  }

  function updateLineItem(index: number, field: keyof LineItem, value: string | number) {
    const updated = [...lineItems];
    if (field === "description") {
      updated[index].description = value as string;
    } else {
      updated[index][field] = Number(value) || 0;
    }
    setLineItems(updated);
  }

  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  async function handleSave(andSend = false) {
    if (andSend) setSending(true);
    else setSaving(true);

    try {
      const body = {
        customer_id: customerId,
        business_id: businessId,
        order_ids: initialData?.orderIds || undefined,
        line_items: lineItems.filter((li) => li.description.trim()),
        notes: notes || null,
        internal_notes: internalNotes || null,
        payment_method: paymentMethod,
        due_days: dueDays,
        tax_rate: taxRate,
      };

      const isEdit = mode === "edit" && invoiceId;
      const url = isEdit ? `/api/invoices/${invoiceId}` : "/api/invoices";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || `Failed to ${isEdit ? "update" : "create"} invoice.`);
        return;
      }

      const invoice = await res.json();

      if (andSend) {
        await fetch(`/api/invoices/${invoice.id}/send`, { method: "POST" });
      }

      if (isEdit) {
        router.push(backHref);
      } else if (initialData?.orderIds?.length) {
        // When creating from an order, redirect back to the order
        router.push(successHref);
      } else {
        router.push(`${successHref}/${invoice.id}`);
      }
    } catch (error) {
      console.error("Failed to save invoice:", error);
      alert("Failed to save invoice.");
    } finally {
      setSaving(false);
      setSending(false);
    }
  }

  async function handlePreview() {
    setPreviewing(true);
    try {
      const body = {
        customer_id: customerId,
        business_id: businessId,
        order_ids: initialData?.orderIds || undefined,
        line_items: lineItems.filter((li) => li.description.trim()),
        notes: notes || null,
        internal_notes: internalNotes || null,
        payment_method: paymentMethod,
        due_days: dueDays,
        tax_rate: taxRate,
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to save invoice for preview.");
        return;
      }

      const invoice = await res.json();
      if (invoice.invoice_access_token) {
        window.open(`/invoice/${invoice.invoice_access_token}`, "_blank");
      } else {
        alert("Invoice saved but no access token was generated.");
      }
    } catch (error) {
      console.error("Failed to preview invoice:", error);
      alert("Failed to save invoice for preview.");
    } finally {
      setPreviewing(false);
    }
  }

  if (loadingInvoice) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => router.push(backHref)}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-slate-900">
          {mode === "edit" ? "Edit Invoice" : "New Invoice"}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {mode === "edit"
            ? "Update the invoice details below."
            : "Create a new invoice for a customer."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">
              Customer
            </h3>
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Customer name or email (optional — can be set later)"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-slate-400 mt-1">
              Leave blank for a manual invoice.
            </p>
          </div>

          {/* Line items */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Line Items
              </h3>
              <button
                onClick={addLineItem}
                className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 uppercase">
                <div className="col-span-5 sm:col-span-6">Description</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-3 text-right">Unit Price</div>
                <div className="col-span-2 sm:col-span-1" />
              </div>

              {lineItems.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5 sm:col-span-6">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(i, "description", e.target.value)
                      }
                      placeholder="Item description"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(i, "quantity", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-right"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_price || ""}
                      onChange={(e) =>
                        updateLineItem(i, "unit_price", e.target.value)
                      }
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-right"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 text-right">
                    {lineItems.length > 1 && (
                      <button
                        onClick={() => removeLineItem(i)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-6 border-t border-slate-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-900">
                  {`£${subtotal.toFixed(2)}`}
                </span>
              </div>
              {taxRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{`Tax (${taxRate}%)`}</span>
                  <span className="text-slate-700">
                    {`£${taxAmount.toFixed(2)}`}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold border-t border-slate-200 pt-2">
                <span className="text-slate-900">Total</span>
                <span className="text-slate-900">
                  {`£${total.toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">
              Notes
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Customer-facing Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Shown on the invoice"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Internal Notes
                </label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={2}
                  placeholder="Only visible to you"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar settings */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Settings</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Payment Terms
              </label>
              <select
                value={dueDays}
                onChange={(e) => setDueDays(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value={7}>Net 7</option>
                <option value={14}>Net 14</option>
                <option value={30}>Net 30</option>
                <option value={45}>Net 45</option>
                <option value={60}>Net 60</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={taxRate || ""}
                onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="invoice_offline">Bank Transfer</option>
                <option value="invoice_online">Online (Stripe Link)</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => handleSave(false)}
              disabled={saving || sending || previewing}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {mode === "edit" ? "Save Changes" : "Save as Draft"}
            </button>
            <button
              onClick={handlePreview}
              disabled={saving || sending || previewing}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              {previewing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              Preview
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving || sending || previewing}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Save & Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
