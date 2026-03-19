"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  Loader2,
  Plus,
  Trash2,
  Save,
  Send,
  Search,
  X,
} from "@/components/icons";

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface ContactResult {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  business_name: string | null;
  businesses?: { id: string; name: string }[];
}

export interface InvoiceInitialData {
  customerId?: string;
  businessId?: string;
  wholesaleAccessId?: string;
  customerName?: string;
  customerEmail?: string;
  customerBusiness?: string;
  lineItems?: LineItem[];
  orderIds?: string[];
  dueDays?: number;
  paymentMethod?: string;
  notes?: string;
  internalNotes?: string;
  taxRate?: number;
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
  const [customerId, setCustomerId] = useState<string | null>(
    initialData?.customerId || null
  );
  const [businessId, setBusinessId] = useState<string | null>(
    initialData?.businessId || null
  );
  const [selectedContact, setSelectedContact] = useState<{
    name: string;
    email: string | null;
    business: string | null;
  } | null>(
    initialData?.customerName
      ? {
          name: initialData.customerName,
          email: initialData.customerEmail || null,
          business: initialData.customerBusiness || null,
        }
      : null
  );

  // Contact search
  const [contactQuery, setContactQuery] = useState("");
  const [contactResults, setContactResults] = useState<ContactResult[]>([]);
  const [contactSearching, setContactSearching] = useState(false);
  const contactDebounce = useRef<ReturnType<typeof setTimeout>>();

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>(
    initialData?.lineItems && initialData.lineItems.length > 0
      ? initialData.lineItems
      : [{ description: "", quantity: 1, unit_price: 0 }]
  );

  // Settings
  const [dueDays, setDueDays] = useState(initialData?.dueDays ?? 30);
  const [taxRate, setTaxRate] = useState(initialData?.taxRate ?? 0);
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [internalNotes, setInternalNotes] = useState(
    initialData?.internalNotes || ""
  );
  const [paymentMethod, setPaymentMethod] = useState(
    initialData?.paymentMethod || "invoice_offline"
  );

  // State
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(
    mode === "edit" && !initialData
  );

  // Edit mode: fetch existing invoice data on mount
  const fetchInvoice = useCallback(async () => {
    if (!invoiceId) return;
    setLoadingInvoice(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      if (!res.ok) {
        alert("Failed to load invoice.");
        router.push(backHref);
        return;
      }
      const data = await res.json();

      setCustomerId(data.customer_id || null);
      setBusinessId(data.business_id || null);

      const customerName = data.customer_name || null;
      const customerEmail = data.customer_email || null;
      const businessName = data.business_name || null;

      if (customerName || customerEmail || businessName) {
        setSelectedContact({
          name: customerName || customerEmail || "",
          email: customerEmail,
          business: businessName,
        });
      }

      // Populate line items from structured_line_items
      if (data.structured_line_items?.length > 0) {
        setLineItems(
          data.structured_line_items.map(
            (li: { description: string; quantity: number; unit_price: number }) => ({
              description: li.description,
              quantity: li.quantity,
              unit_price: li.unit_price,
            })
          )
        );
      }

      setDueDays(data.due_days ?? 30);
      setTaxRate(data.tax_rate ?? 0);
      setNotes(data.notes || "");
      setInternalNotes(data.internal_notes || "");
      setPaymentMethod(data.payment_method || "invoice_offline");
    } catch {
      alert("Failed to load invoice.");
      router.push(backHref);
    } finally {
      setLoadingInvoice(false);
    }
  }, [invoiceId, backHref, router]);

  useEffect(() => {
    if (mode === "edit" && invoiceId && !initialData) {
      fetchInvoice();
    }
  }, [mode, invoiceId, initialData, fetchInvoice]);

  // Contact search handler (debounced)
  function handleContactSearch(query: string) {
    setContactQuery(query);
    if (contactDebounce.current) clearTimeout(contactDebounce.current);
    if (!query.trim()) {
      setContactResults([]);
      return;
    }
    contactDebounce.current = setTimeout(async () => {
      setContactSearching(true);
      try {
        const res = await fetch(
          `/api/contacts?search=${encodeURIComponent(query.trim())}&status=all&page=1`
        );
        if (res.ok) {
          const data = await res.json();
          setContactResults((data.contacts || []).slice(0, 5));
        }
      } catch {
        /* ignore */
      }
      setContactSearching(false);
    }, 300);
  }

  function handleSelectContact(contact: ContactResult) {
    setCustomerId(contact.id);
    setBusinessId(contact.businesses?.[0]?.id || null);
    setSelectedContact({
      name: `${contact.first_name} ${contact.last_name}`.trim(),
      email: contact.email,
      business:
        contact.businesses?.[0]?.name || contact.business_name || null,
    });
    setContactQuery("");
    setContactResults([]);
  }

  function handleClearContact() {
    setCustomerId(null);
    setBusinessId(null);
    setSelectedContact(null);
    setContactQuery("");
    setContactResults([]);
  }

  // Line item helpers
  function addLineItem() {
    setLineItems([
      ...lineItems,
      { description: "", quantity: 1, unit_price: 0 },
    ]);
  }

  function removeLineItem(index: number) {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  }

  function updateLineItem(
    index: number,
    field: keyof LineItem,
    value: string | number
  ) {
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
        wholesale_access_id: initialData?.wholesaleAccessId || undefined,
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
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(
          err.error ||
            `Failed to ${isEdit ? "update" : "create"} invoice.`
        );
        return;
      }

      const invoice = await res.json();
      const savedId = isEdit ? invoiceId : invoice.id;

      if (andSend) {
        const sendRes = await fetch(`/api/invoices/${savedId}/send`, {
          method: "POST",
        });
        if (!sendRes.ok) {
          const sendErr = await sendRes.json().catch(() => ({}));
          alert(
            sendErr.error ||
              "Invoice saved but failed to send. You can send it from the invoice detail page."
          );
          // Still navigate to the invoice — it was saved
        }
      }

      // Navigate to detail page
      if (isEdit) {
        router.push(`${successHref}/${invoiceId}`);
      } else if (initialData?.orderIds?.length) {
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

  if (loadingInvoice) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
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
            ? "Update this draft invoice."
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
            {selectedContact ? (
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {selectedContact.name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {[selectedContact.email, selectedContact.business]
                      .filter(Boolean)
                      .join(" · ") || "No email or business"}
                  </p>
                </div>
                <button
                  onClick={handleClearContact}
                  className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={contactQuery}
                    onChange={(e) => handleContactSearch(e.target.value)}
                    placeholder="Search contacts by name or email..."
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  {contactSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                  )}
                </div>

                {/* Search results dropdown */}
                {contactQuery.trim() && !contactSearching && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {contactResults.length > 0
                      ? contactResults.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => handleSelectContact(c)}
                            className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                          >
                            <p className="text-sm font-medium text-slate-900">
                              {`${c.first_name} ${c.last_name}`.trim()}
                            </p>
                            <p className="text-xs text-slate-500">
                              {[c.email, c.business_name]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </button>
                        ))
                      : (
                          <div className="px-3 py-2.5 text-sm text-slate-500">
                            No contacts found.
                          </div>
                        )}
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-1">
              {selectedContact
                ? "This contact will receive the invoice."
                : "Leave blank for a manual invoice."}
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
              disabled={saving || sending}
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
              onClick={() => setShowPreview(true)}
              disabled={saving || sending}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving || sending}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {mode === "edit" ? "Save & Send" : "Save & Send"}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                Invoice Preview
              </h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer info */}
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase mb-1">
                  Bill To
                </p>
                {selectedContact ? (
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {selectedContact.name}
                    </p>
                    {selectedContact.business && (
                      <p className="text-sm text-slate-600">
                        {selectedContact.business}
                      </p>
                    )}
                    {selectedContact.email && (
                      <p className="text-sm text-slate-500">
                        {selectedContact.email}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">
                    No customer selected
                  </p>
                )}
              </div>

              {/* Settings row */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase mb-1">
                    Payment Terms
                  </p>
                  <p className="text-slate-900">{`Net ${dueDays}`}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase mb-1">
                    Payment Method
                  </p>
                  <p className="text-slate-900">
                    {paymentMethod === "invoice_online"
                      ? "Online (Stripe)"
                      : "Bank Transfer"}
                  </p>
                </div>
                {taxRate > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase mb-1">
                      Tax Rate
                    </p>
                    <p className="text-slate-900">{`${taxRate}%`}</p>
                  </div>
                )}
              </div>

              {/* Line items table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-2">
                        Description
                      </th>
                      <th className="text-right text-xs font-medium text-slate-500 uppercase px-4 py-2">
                        Qty
                      </th>
                      <th className="text-right text-xs font-medium text-slate-500 uppercase px-4 py-2">
                        Unit Price
                      </th>
                      <th className="text-right text-xs font-medium text-slate-500 uppercase px-4 py-2">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lineItems
                      .filter((li) => li.description.trim())
                      .map((item, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2.5 text-sm text-slate-900">
                            {item.description}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-slate-700 text-right">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-slate-700 text-right">
                            {`£${item.unit_price.toFixed(2)}`}
                          </td>
                          <td className="px-4 py-2.5 text-sm font-medium text-slate-900 text-right">
                            {`£${(item.quantity * item.unit_price).toFixed(2)}`}
                          </td>
                        </tr>
                      ))}
                    {lineItems.filter((li) => li.description.trim()).length ===
                      0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-4 text-center text-sm text-slate-400"
                        >
                          No line items
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200">
                      <td
                        colSpan={3}
                        className="px-4 py-2 text-sm font-medium text-slate-700 text-right"
                      >
                        Subtotal
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-slate-900 text-right">
                        {`£${subtotal.toFixed(2)}`}
                      </td>
                    </tr>
                    {taxRate > 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-2 text-sm text-slate-500 text-right"
                        >
                          {`Tax (${taxRate}%)`}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-700 text-right">
                          {`£${taxAmount.toFixed(2)}`}
                        </td>
                      </tr>
                    )}
                    <tr className="border-t border-slate-300">
                      <td
                        colSpan={3}
                        className="px-4 py-3 text-base font-semibold text-slate-900 text-right"
                      >
                        Total
                      </td>
                      <td className="px-4 py-3 text-base font-semibold text-slate-900 text-right">
                        {`£${total.toFixed(2)}`}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Notes */}
              {notes && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase mb-1">
                    Notes
                  </p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowPreview(false);
                  handleSave(false);
                }}
                disabled={saving || sending}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                {mode === "edit" ? "Save Changes" : "Create Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
