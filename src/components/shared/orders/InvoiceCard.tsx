"use client";

import Link from "next/link";
import { FileText } from "@/components/icons";
import { StatusBadge } from "@/components/admin";
import { formatDate, formatPrice } from "./format";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface InvoiceCardProps {
  invoice: any | null;
  orderId: string;
  paymentMethod?: string | null;
  paymentTerms?: string | null;
  showCreateButton?: boolean;
  createHref?: string;
}

export function InvoiceCard({
  invoice,
  orderId,
  paymentMethod,
  paymentTerms,
  showCreateButton = true,
  createHref,
}: InvoiceCardProps) {
  const isInvoiceOrder =
    paymentMethod === "invoice_online" ||
    paymentMethod === "invoice_offline" ||
    (paymentTerms && paymentTerms !== "prepay");

  // Only show this card if there's an invoice or if this is an invoice-type order
  if (!invoice && !isInvoiceOrder) return null;

  const defaultCreateHref = `/orders/${orderId}/create-invoice`;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900">Invoice</h3>
      </div>

      {invoice ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-900">{invoice.invoice_number}</span>
            <StatusBadge status={invoice.status} type="invoiceStatus" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-sm text-slate-900">{formatPrice(invoice.total)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Amount Paid</p>
              <p className="text-sm text-slate-900">{formatPrice(invoice.amount_paid || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Amount Due</p>
              <p className="text-sm text-slate-900">{formatPrice(invoice.amount_due || 0)}</p>
            </div>
            {invoice.payment_due_date && (
              <div>
                <p className="text-xs text-slate-500">Due Date</p>
                <p className="text-sm text-slate-900">{formatDate(invoice.payment_due_date)}</p>
              </div>
            )}
          </div>
          <Link
            href={`/invoices/${invoice.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700"
          >
            <FileText className="w-4 h-4" /> View Invoice
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            {`This order uses ${paymentTerms || "invoice"} payment terms. No invoice has been created yet.`}
          </p>
          {showCreateButton && (
            <Link
              href={createHref || defaultCreateHref}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              <FileText className="w-4 h-4" /> Create Invoice
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
