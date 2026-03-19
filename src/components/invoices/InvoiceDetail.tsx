"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  Loader2,
  Send,
  Ban,
  CheckCircle2,
  Bell,
  ExternalLink,
  Plus,
  Pencil,
} from "@/components/icons";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { InvoiceFull, InvoiceLineItem, InvoicePayment } from "@/types/finance";

function formatCurrency(amount: number) {
  return `£${amount.toFixed(2)}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface InvoiceDetailProps {
  invoiceId: string;
  ownerType: "ghost_roastery" | "roaster";
  backHref: string;
  editHref?: string;
  readOnly?: boolean;
}

export function InvoiceDetail({
  invoiceId,
  backHref,
  editHref,
  readOnly = false,
}: InvoiceDetailProps) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  // Record payment form
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("bank_transfer");
  const [payRef, setPayRef] = useState("");

  const loadInvoice = useCallback(async () => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      if (!res.ok) {
        setInvoice(null);
        return;
      }
      setInvoice(await res.json());
    } catch {
      setInvoice(null);
    }
    setLoading(false);
  }, [invoiceId]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  async function handleSend() {
    setActing("send");
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: "POST",
      });
      if (res.ok) {
        await loadInvoice();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to send invoice.");
      }
    } catch {
      alert("Failed to send invoice.");
    }
    setActing(null);
  }

  async function handleVoid() {
    if (!confirm("Void this invoice? This cannot be undone.")) return;
    setActing("void");
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/void`, {
        method: "POST",
      });
      if (res.ok) await loadInvoice();
      else alert("Failed to void invoice.");
    } catch {
      alert("Failed to void invoice.");
    }
    setActing(null);
  }

  async function handleReminder() {
    setActing("reminder");
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/send-reminder`, {
        method: "POST",
      });
      if (res.ok) await loadInvoice();
      else alert("Failed to send reminder.");
    } catch {
      alert("Failed to send reminder.");
    }
    setActing(null);
  }

  async function handleRecordPayment() {
    if (!payAmount || isNaN(Number(payAmount))) return;
    setActing("payment");
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/record-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(payAmount),
          payment_method: payMethod,
          reference: payRef || null,
        }),
      });
      if (res.ok) {
        setShowPayment(false);
        setPayAmount("");
        setPayRef("");
        await loadInvoice();
      } else {
        alert("Failed to record payment.");
      }
    } catch {
      alert("Failed to record payment.");
    }
    setActing(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-slate-500">Invoice not found.</p>
        <button
          onClick={() => router.push(backHref)}
          className="mt-4 text-brand-600 text-sm font-medium"
        >
          Go back
        </button>
      </div>
    );
  }

  const lineItems: InvoiceLineItem[] = invoice.structured_line_items || [];
  const payments: InvoicePayment[] = invoice.payments || [];
  const canSend = invoice.status === "draft";
  const canVoid =
    !readOnly &&
    invoice.status !== "void" &&
    invoice.status !== "cancelled" &&
    invoice.status !== "paid";
  const canRemind =
    !readOnly &&
    (invoice.status === "sent" ||
      invoice.status === "viewed" ||
      invoice.status === "overdue");
  const canRecordPayment =
    !readOnly &&
    invoice.status !== "void" &&
    invoice.status !== "cancelled" &&
    invoice.status !== "paid";
  const publicUrl = invoice.invoice_access_token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/invoice/${invoice.invoice_access_token}`
    : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push(backHref)}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">
                {invoice.invoice_number}
              </h1>
              <StatusBadge status={invoice.status} type="invoiceStatus" />
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {`Created ${formatDate(invoice.created_at)}`}
              {invoice.payment_due_date &&
                ` · Due ${formatDate(invoice.payment_due_date)}`}
            </p>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2 flex-wrap">
              {invoice.status === "draft" && editHref && (
                <button
                  onClick={() => router.push(`${editHref}/${invoiceId}/edit`)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
              )}
              {invoice.invoice_access_token && (
                <button
                  onClick={() => window.open(`/invoice/${invoice.invoice_access_token}`, "_blank")}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
              )}
              {canSend && (
                <button
                  onClick={handleSend}
                  disabled={acting !== null}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                >
                  {acting === "send" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send
                </button>
              )}
              {canRemind && (
                <button
                  onClick={handleReminder}
                  disabled={acting !== null}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  {acting === "reminder" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                  Send Reminder
                </button>
              )}
              {canRecordPayment && (
                <button
                  onClick={() => setShowPayment(!showPayment)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                >
                  <Plus className="w-4 h-4" />
                  Record Payment
                </button>
              )}
              {canVoid && (
                <button
                  onClick={handleVoid}
                  disabled={acting !== null}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                >
                  <Ban className="w-4 h-4" />
                  Void
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Line items */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">
                Line Items
              </h3>
            </div>
            {lineItems.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                No line items.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-2">
                        Description
                      </th>
                      <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-2">
                        Qty
                      </th>
                      <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-2">
                        Unit Price
                      </th>
                      <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-2">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lineItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-3 text-sm text-slate-900">
                          {item.description}
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-700 text-right">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-700 text-right">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-6 py-3 text-sm font-medium text-slate-900 text-right">
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200">
                      <td
                        colSpan={3}
                        className="px-6 py-2 text-sm font-medium text-slate-700 text-right"
                      >
                        Subtotal
                      </td>
                      <td className="px-6 py-2 text-sm font-medium text-slate-900 text-right">
                        {formatCurrency(invoice.subtotal)}
                      </td>
                    </tr>
                    {invoice.tax_amount > 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-6 py-2 text-sm text-slate-500 text-right"
                        >
                          {`Tax (${invoice.tax_rate}%)`}
                        </td>
                        <td className="px-6 py-2 text-sm text-slate-700 text-right">
                          {formatCurrency(invoice.tax_amount)}
                        </td>
                      </tr>
                    )}
                    {invoice.discount_amount > 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-6 py-2 text-sm text-slate-500 text-right"
                        >
                          Discount
                        </td>
                        <td className="px-6 py-2 text-sm text-red-600 text-right">
                          {`-${formatCurrency(invoice.discount_amount)}`}
                        </td>
                      </tr>
                    )}
                    <tr className="border-t border-slate-300">
                      <td
                        colSpan={3}
                        className="px-6 py-3 text-base font-semibold text-slate-900 text-right"
                      >
                        Total
                      </td>
                      <td className="px-6 py-3 text-base font-semibold text-slate-900 text-right">
                        {formatCurrency(invoice.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Payment history */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">
                Payment History
              </h3>
            </div>
            {payments.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                No payments recorded.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-2">
                        Date
                      </th>
                      <th className="text-right text-xs font-medium text-slate-500 uppercase px-6 py-2">
                        Amount
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-2">
                        Method
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-2 hidden sm:table-cell">
                        Reference
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="px-6 py-3 text-sm text-slate-700">
                          {formatDate(p.paid_at)}
                        </td>
                        <td className="px-6 py-3 text-sm font-medium text-green-700 text-right">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-500 capitalize">
                          {p.payment_method.replace("_", " ")}
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-500 hidden sm:table-cell">
                          {p.reference || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Record Payment Form */}
          {showPayment && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">
                Record Payment
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Method
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="stripe">Stripe</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Reference
                  </label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleRecordPayment}
                  disabled={acting === "payment"}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {acting === "payment" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Record
                </button>
                <button
                  onClick={() => setShowPayment(false)}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Details</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-500">Customer</p>
                <p className="font-medium text-slate-900">
                  {invoice.customer_name ||
                    invoice.business_name ||
                    invoice.customer_email ||
                    "—"}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Payment Status</p>
                <div className="mt-1">
                  <StatusBadge
                    status={invoice.payment_status}
                    type="invoiceStatus"
                  />
                </div>
              </div>
              <div>
                <p className="text-slate-500">Amount Paid</p>
                <p className="font-medium text-green-700">
                  {formatCurrency(invoice.amount_paid || 0)}
                </p>
              </div>
              {invoice.amount_due != null &&
                invoice.amount_due > 0 && (
                  <div>
                    <p className="text-slate-500">Amount Due</p>
                    <p className="font-medium text-red-700">
                      {formatCurrency(invoice.amount_due)}
                    </p>
                  </div>
                )}
              {invoice.notes && (
                <div>
                  <p className="text-slate-500">Notes</p>
                  <p className="text-slate-700 whitespace-pre-wrap">
                    {invoice.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {publicUrl && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">
                Public Link
              </h3>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 break-all"
              >
                {publicUrl}
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
