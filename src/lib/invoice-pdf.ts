/**
 * Invoice generation — HTML for web preview and PDF for download/email.
 *
 * HTML: Self-contained inline-CSS page optimised for A4 browser printing.
 * PDF:  Server-side rendering via @react-pdf/renderer (works on Vercel).
 */

import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  Font,
  renderToBuffer,
  StyleSheet,
} from "@react-pdf/renderer";
import { resolveFontFamily, buildGoogleFontsUrl } from "@/lib/fonts";

// ─── Shared helpers ──────────────────────────────────────────────

function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    GBP: "\u00a3",
    USD: "$",
    EUR: "\u20ac",
  };
  const symbol = symbols[currency.toUpperCase()] || currency + " ";
  return `${symbol}${amount.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Shared types ────────────────────────────────────────────────

export interface InvoiceBranding {
  logoUrl?: string | null;
  primaryColour?: string;
  accentColour?: string;
  headingFont?: string;
  bodyFont?: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface InvoicePdfParams {
  ownerName: string;
  ownerAddress: string;
  ownerEmail: string;
  vatNumber?: string | null;
  customerName: string;
  customerAddress?: string | null;
  invoiceNumber: string;
  issuedDate: string;
  dueDate: string | null;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  shippingAmount?: number;
  total: number;
  amountPaid: number;
  notes: string | null;
  status: string;
  currency: string;
  branding?: InvoiceBranding;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankSortCode?: string | null;
  paymentInstructions?: string | null;
}

// ─── PDF generation (@react-pdf/renderer) ────────────────────────

// Register Helvetica as fallback — it's built into @react-pdf
// Custom Google Fonts are complex to register dynamically on serverless,
// so we use Helvetica as the PDF font with branded colours instead.

const colours = {
  slate900: "#0f172a",
  slate700: "#334155",
  slate500: "#64748b",
  slate400: "#94a3b8",
  slate200: "#e2e8f0",
  slate100: "#f1f5f9",
  slate50: "#f8fafc",
  green600: "#16a34a",
  greenWatermark: "rgba(34,197,94,0.08)",
  white: "#ffffff",
};

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colours.slate900,
    backgroundColor: colours.white,
  },
  accentBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 28,
  },
  watermark: {
    position: "absolute",
    top: "40%",
    left: "15%",
    fontSize: 100,
    fontFamily: "Helvetica-Bold",
    color: colours.greenWatermark,
    transform: "rotate(-30deg)",
    letterSpacing: 10,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    maxWidth: "55%",
  },
  logoWrap: {
    width: 52,
    height: 52,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  logo: {
    width: 44,
    height: 44,
    objectFit: "contain",
  },
  ownerName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  ownerDetail: {
    fontSize: 9,
    color: colours.slate500,
    lineHeight: 1.6,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  invoiceTitle: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  invoiceNumber: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: colours.slate700,
  },
  invoiceDate: {
    fontSize: 9,
    color: colours.slate500,
    marginTop: 4,
  },
  // Bill To
  sectionLabel: {
    fontSize: 8,
    color: colours.slate400,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  customerName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: colours.slate900,
  },
  customerDetail: {
    fontSize: 9,
    color: colours.slate500,
    marginTop: 2,
  },
  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colours.slate50,
    borderBottomWidth: 2,
    borderBottomColor: colours.slate200,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colours.slate500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colours.slate200,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableCell: {
    fontSize: 10,
    color: colours.slate700,
  },
  colDescription: { flex: 1 },
  colQty: { width: 50, textAlign: "center" },
  colPrice: { width: 80, textAlign: "right" },
  colAmount: { width: 80, textAlign: "right" },
  // Totals
  totalsContainer: {
    alignItems: "flex-end",
    marginTop: 16,
  },
  totalsBlock: {
    width: 240,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalsLabel: {
    fontSize: 10,
    color: colours.slate500,
  },
  totalsValue: {
    fontSize: 10,
    color: colours.slate500,
  },
  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 2,
    marginTop: 6,
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  totalValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  amountDueLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  amountDueLabel: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  amountDueValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  // Bank / payment details
  paymentSection: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colours.slate200,
  },
  paymentDetail: {
    fontSize: 9,
    color: colours.slate500,
    marginTop: 2,
  },
  // Notes
  notesSection: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colours.slate200,
  },
  notesText: {
    fontSize: 9,
    color: colours.slate500,
    lineHeight: 1.6,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 48,
    right: 48,
    textAlign: "center",
    fontSize: 7,
    color: colours.slate400,
  },
});

function InvoiceDocument(props: InvoicePdfParams) {
  const {
    ownerName,
    ownerAddress,
    ownerEmail,
    vatNumber,
    customerName,
    customerAddress,
    invoiceNumber,
    issuedDate,
    dueDate,
    lineItems,
    subtotal,
    taxRate,
    taxAmount,
    discountAmount,
    shippingAmount = 0,
    total,
    amountPaid,
    notes,
    status,
    currency,
    branding,
    bankName,
    bankAccountNumber,
    bankSortCode,
    paymentInstructions,
  } = props;

  const amountDue = total - amountPaid;
  const isPaid = status === "paid";
  const primaryColour = branding?.primaryColour || colours.slate900;
  const accentColour = branding?.accentColour || colours.slate900;
  const hasBankDetails = bankName || bankAccountNumber || bankSortCode;

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },

      // Accent bar
      React.createElement(View, {
        style: { ...styles.accentBar, backgroundColor: accentColour },
      }),

      // PAID watermark
      isPaid
        ? React.createElement(Text, { style: styles.watermark }, "PAID")
        : null,

      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(
          View,
          { style: styles.headerLeft },
          branding?.logoUrl
            ? React.createElement(
                View,
                { style: { ...styles.logoWrap, backgroundColor: primaryColour } },
                React.createElement(Image, {
                  src: branding.logoUrl,
                  style: styles.logo,
                })
              )
            : null,
          React.createElement(
            View,
            null,
            React.createElement(
              Text,
              { style: { ...styles.ownerName, color: primaryColour } },
              ownerName
            ),
            ownerAddress
              ? React.createElement(
                  Text,
                  { style: styles.ownerDetail },
                  ownerAddress
                )
              : null,
            ownerEmail
              ? React.createElement(
                  Text,
                  { style: styles.ownerDetail },
                  ownerEmail
                )
              : null,
            vatNumber
              ? React.createElement(
                  Text,
                  { style: { ...styles.ownerDetail, marginTop: 2 } },
                  `VAT: ${vatNumber}`
                )
              : null
          )
        ),
        React.createElement(
          View,
          { style: styles.headerRight },
          React.createElement(
            Text,
            { style: { ...styles.invoiceTitle, color: primaryColour } },
            "INVOICE"
          ),
          React.createElement(
            Text,
            { style: styles.invoiceNumber },
            invoiceNumber
          ),
          React.createElement(
            Text,
            { style: styles.invoiceDate },
            `Issued: ${formatDate(issuedDate)}`
          ),
          dueDate
            ? React.createElement(
                Text,
                { style: styles.invoiceDate },
                `Due: ${formatDate(dueDate)}`
              )
            : null
        )
      ),

      // Bill To
      React.createElement(
        View,
        { style: { marginBottom: 24 } },
        React.createElement(Text, { style: styles.sectionLabel }, "Bill To"),
        React.createElement(
          Text,
          { style: styles.customerName },
          customerName
        ),
        customerAddress
          ? React.createElement(
              Text,
              { style: styles.customerDetail },
              customerAddress
            )
          : null
      ),

      // Line items table — header
      React.createElement(
        View,
        { style: styles.tableHeader },
        React.createElement(
          Text,
          { style: { ...styles.tableHeaderCell, ...styles.colDescription } },
          "Description"
        ),
        React.createElement(
          Text,
          { style: { ...styles.tableHeaderCell, ...styles.colQty } },
          "Qty"
        ),
        React.createElement(
          Text,
          { style: { ...styles.tableHeaderCell, ...styles.colPrice } },
          "Unit Price"
        ),
        React.createElement(
          Text,
          { style: { ...styles.tableHeaderCell, ...styles.colAmount } },
          "Amount"
        )
      ),

      // Line items table — rows
      ...lineItems.map((item, i) =>
        React.createElement(
          View,
          { key: i, style: styles.tableRow },
          React.createElement(
            Text,
            { style: { ...styles.tableCell, ...styles.colDescription } },
            item.description
          ),
          React.createElement(
            Text,
            { style: { ...styles.tableCell, ...styles.colQty } },
            String(item.quantity)
          ),
          React.createElement(
            Text,
            { style: { ...styles.tableCell, ...styles.colPrice } },
            formatCurrency(item.unit_price, currency)
          ),
          React.createElement(
            Text,
            { style: { ...styles.tableCell, ...styles.colAmount } },
            formatCurrency(item.total, currency)
          )
        )
      ),

      // Totals
      React.createElement(
        View,
        { style: styles.totalsContainer },
        React.createElement(
          View,
          { style: styles.totalsBlock },

          // Subtotal
          React.createElement(
            View,
            { style: styles.totalsRow },
            React.createElement(Text, { style: styles.totalsLabel }, "Subtotal"),
            React.createElement(
              Text,
              { style: styles.totalsValue },
              formatCurrency(subtotal, currency)
            )
          ),

          // Discount
          discountAmount > 0
            ? React.createElement(
                View,
                { style: styles.totalsRow },
                React.createElement(
                  Text,
                  { style: styles.totalsLabel },
                  "Discount"
                ),
                React.createElement(
                  Text,
                  { style: styles.totalsValue },
                  `-${formatCurrency(discountAmount, currency)}`
                )
              )
            : null,

          // Shipping
          shippingAmount > 0
            ? React.createElement(
                View,
                { style: styles.totalsRow },
                React.createElement(
                  Text,
                  { style: styles.totalsLabel },
                  "Shipping"
                ),
                React.createElement(
                  Text,
                  { style: styles.totalsValue },
                  formatCurrency(shippingAmount, currency)
                )
              )
            : null,

          // Tax
          taxRate > 0
            ? React.createElement(
                View,
                { style: styles.totalsRow },
                React.createElement(
                  Text,
                  { style: styles.totalsLabel },
                  `Tax (${taxRate}%)`
                ),
                React.createElement(
                  Text,
                  { style: styles.totalsValue },
                  formatCurrency(taxAmount, currency)
                )
              )
            : null,

          // Total line
          React.createElement(
            View,
            {
              style: {
                ...styles.totalLine,
                borderTopColor: primaryColour,
              },
            },
            React.createElement(
              Text,
              { style: { ...styles.totalLabel, color: primaryColour } },
              "Total"
            ),
            React.createElement(
              Text,
              { style: { ...styles.totalValue, color: primaryColour } },
              formatCurrency(total, currency)
            )
          ),

          // Amount paid / due
          amountPaid > 0
            ? React.createElement(
                View,
                null,
                React.createElement(
                  View,
                  { style: styles.totalsRow },
                  React.createElement(
                    Text,
                    { style: styles.totalsLabel },
                    "Amount Paid"
                  ),
                  React.createElement(
                    Text,
                    { style: styles.totalsValue },
                    `-${formatCurrency(amountPaid, currency)}`
                  )
                ),
                React.createElement(
                  View,
                  { style: styles.amountDueLine },
                  React.createElement(
                    Text,
                    {
                      style: {
                        ...styles.amountDueLabel,
                        color: isPaid ? colours.green600 : primaryColour,
                      },
                    },
                    "Amount Due"
                  ),
                  React.createElement(
                    Text,
                    {
                      style: {
                        ...styles.amountDueValue,
                        color: isPaid ? colours.green600 : primaryColour,
                      },
                    },
                    formatCurrency(amountDue, currency)
                  )
                )
              )
            : null
        )
      ),

      // Payment / bank details
      hasBankDetails || paymentInstructions
        ? React.createElement(
            View,
            { style: styles.paymentSection },
            React.createElement(
              Text,
              { style: styles.sectionLabel },
              "Payment Details"
            ),
            bankName
              ? React.createElement(
                  Text,
                  { style: styles.paymentDetail },
                  `Bank: ${bankName}`
                )
              : null,
            bankSortCode
              ? React.createElement(
                  Text,
                  { style: styles.paymentDetail },
                  `Sort Code: ${bankSortCode}`
                )
              : null,
            bankAccountNumber
              ? React.createElement(
                  Text,
                  { style: styles.paymentDetail },
                  `Account: ${bankAccountNumber}`
                )
              : null,
            paymentInstructions
              ? React.createElement(
                  Text,
                  { style: { ...styles.paymentDetail, marginTop: 6 } },
                  paymentInstructions
                )
              : null
          )
        : null,

      // Notes
      notes
        ? React.createElement(
            View,
            { style: styles.notesSection },
            React.createElement(Text, { style: styles.sectionLabel }, "Notes"),
            React.createElement(Text, { style: styles.notesText }, notes)
          )
        : null,

      // Footer
      React.createElement(
        Text,
        { style: styles.footer },
        `${ownerName} \u00b7 Powered by Roastery Platform`
      )
    )
  );
}

/**
 * Generate a real PDF buffer from invoice data.
 * Uses @react-pdf/renderer for pure-Node server-side rendering.
 */
export async function generateInvoicePdf(
  params: InvoicePdfParams
): Promise<Buffer> {
  const doc = InvoiceDocument(params);
  const buffer = await renderToBuffer(doc as React.ReactElement);
  return Buffer.from(buffer);
}

/**
 * Generate PDF and return as a Resend-compatible email attachment.
 * Usage: pass the returned object into the `attachments` array of a Resend email.
 */
export async function generateInvoiceAttachment(
  params: InvoicePdfParams
): Promise<{ filename: string; content: Buffer }> {
  const buffer = await generateInvoicePdf(params);
  const safeFilename = params.invoiceNumber.replace(/[^a-zA-Z0-9\-_]/g, "_");
  return {
    filename: `${safeFilename}.pdf`,
    content: buffer,
  };
}

// ─── HTML generation (kept for public web view) ──────────────────

export function generateInvoiceHtml(params: {
  ownerName: string;
  ownerAddress: string;
  ownerEmail: string;
  customerName: string;
  invoiceNumber: string;
  issuedDate: string;
  dueDate: string | null;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  shippingAmount?: number;
  total: number;
  amountPaid: number;
  notes: string | null;
  status: string;
  currency: string;
  branding?: InvoiceBranding;
}): string {
  const {
    ownerName,
    ownerAddress,
    ownerEmail,
    customerName,
    invoiceNumber,
    issuedDate,
    dueDate,
    lineItems,
    subtotal,
    taxRate,
    taxAmount,
    discountAmount,
    shippingAmount = 0,
    total,
    amountPaid,
    notes,
    status,
    currency,
    branding,
  } = params;

  const amountDue = total - amountPaid;
  const isPaid = status === "paid";

  // Resolve branding
  const primaryColour = branding?.primaryColour || "#0f172a";
  const accentColour = branding?.accentColour || "#0f172a";
  const headingFamily = resolveFontFamily(branding?.headingFont || null);
  const bodyFamily = resolveFontFamily(branding?.bodyFont || null);
  const logoUrl = branding?.logoUrl || null;

  // Build Google Fonts link for the HTML
  const fontsToLoad = Array.from(new Set([headingFamily, bodyFamily]));
  const googleFontsUrl = buildGoogleFontsUrl(fontsToLoad);

  const lineItemsHtml = lineItems
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:13px;font-family:'${bodyFamily}',sans-serif;">${escapeHtml(item.description)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:13px;text-align:center;font-family:'${bodyFamily}',sans-serif;">${item.quantity}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:13px;text-align:right;font-family:'${bodyFamily}',sans-serif;">${formatCurrency(item.unit_price, currency)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:13px;text-align:right;font-family:'${bodyFamily}',sans-serif;">${formatCurrency(item.total, currency)}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${escapeHtml(invoiceNumber)}</title>
  ${googleFontsUrl ? `<link rel="stylesheet" href="${googleFontsUrl}">` : ""}
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    @media print {
      body { margin: 0; padding: 0; }
      .page { box-shadow: none !important; margin: 0 !important; padding: 40px !important; }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 20px;
      background: #f1f5f9;
      font-family: '${bodyFamily}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  </style>
</head>
<body>
  <div class="page" style="max-width:210mm;margin:0 auto;background:#ffffff;padding:48px;box-shadow:0 1px 3px rgba(0,0,0,0.1);position:relative;">

    <!-- Accent bar -->
    <div style="height:4px;background:${accentColour};border-radius:2px;margin-bottom:32px;"></div>

    ${isPaid ? `
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:120px;font-weight:900;color:rgba(34,197,94,0.08);text-transform:uppercase;letter-spacing:12px;pointer-events:none;z-index:0;">
      PAID
    </div>` : ""}

    <!-- Header -->
    <div style="display:flex;justify-content:space-between;margin-bottom:40px;position:relative;z-index:1;">
      <div style="display:flex;align-items:flex-start;gap:12px;">
        ${logoUrl ? `<div style="width:56px;height:56px;background-color:${primaryColour};border-radius:8px;display:flex;align-items:center;justify-content:center;padding:4px;"><img src="${logoUrl}" alt="" style="width:48px;height:48px;object-fit:contain;"></div>` : ""}
        <div>
          <h2 style="margin:0 0 8px;font-size:18px;font-weight:700;color:${primaryColour};font-family:'${headingFamily}',sans-serif;">${escapeHtml(ownerName)}</h2>
          ${ownerAddress ? `<p style="margin:0;font-size:12px;color:#64748b;white-space:pre-line;line-height:1.6;font-family:'${bodyFamily}',sans-serif;">${escapeHtml(ownerAddress)}</p>` : ""}
          ${ownerEmail ? `<p style="margin:4px 0 0;font-size:12px;color:#64748b;font-family:'${bodyFamily}',sans-serif;">${escapeHtml(ownerEmail)}</p>` : ""}
        </div>
      </div>
      <div style="text-align:right;">
        <h1 style="margin:0 0 8px;font-size:28px;font-weight:800;color:${primaryColour};font-family:'${headingFamily}',sans-serif;">INVOICE</h1>
        <p style="margin:0;font-size:14px;color:#334155;font-weight:600;font-family:'${bodyFamily}',sans-serif;">${escapeHtml(invoiceNumber)}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#64748b;font-family:'${bodyFamily}',sans-serif;">Issued: ${formatDate(issuedDate)}</p>
        ${dueDate ? `<p style="margin:4px 0 0;font-size:12px;color:#64748b;font-family:'${bodyFamily}',sans-serif;">Due: ${formatDate(dueDate)}</p>` : ""}
      </div>
    </div>

    <!-- Bill To -->
    <div style="margin-bottom:32px;position:relative;z-index:1;">
      <p style="margin:0 0 6px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;font-family:'${bodyFamily}',sans-serif;">Bill To</p>
      <p style="margin:0;font-size:14px;font-weight:600;color:#0f172a;font-family:'${bodyFamily}',sans-serif;">${escapeHtml(customerName)}</p>
    </div>

    <!-- Line Items Table -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;position:relative;z-index:1;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e2e8f0;font-family:'${bodyFamily}',sans-serif;">Description</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e2e8f0;font-family:'${bodyFamily}',sans-serif;">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e2e8f0;font-family:'${bodyFamily}',sans-serif;">Unit Price</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e2e8f0;font-family:'${bodyFamily}',sans-serif;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsHtml}
      </tbody>
    </table>

    <!-- Totals -->
    <div style="display:flex;justify-content:flex-end;position:relative;z-index:1;">
      <div style="width:280px;">
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#64748b;font-family:'${bodyFamily}',sans-serif;">
          <span>Subtotal</span>
          <span>${formatCurrency(subtotal, currency)}</span>
        </div>
        ${discountAmount > 0 ? `
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#64748b;font-family:'${bodyFamily}',sans-serif;">
          <span>Discount</span>
          <span>-${formatCurrency(discountAmount, currency)}</span>
        </div>` : ""}
        ${shippingAmount > 0 ? `
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#64748b;font-family:'${bodyFamily}',sans-serif;">
          <span>Shipping</span>
          <span>${formatCurrency(shippingAmount, currency)}</span>
        </div>` : ""}
        ${taxRate > 0 ? `
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#64748b;font-family:'${bodyFamily}',sans-serif;">
          <span>Tax (${taxRate}%)</span>
          <span>${formatCurrency(taxAmount, currency)}</span>
        </div>` : ""}
        <div style="display:flex;justify-content:space-between;padding:10px 0 6px;font-size:16px;font-weight:700;color:${primaryColour};border-top:2px solid ${primaryColour};margin-top:8px;font-family:'${headingFamily}',sans-serif;">
          <span>Total</span>
          <span>${formatCurrency(total, currency)}</span>
        </div>
        ${amountPaid > 0 ? `
        <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#64748b;font-family:'${bodyFamily}',sans-serif;">
          <span>Amount Paid</span>
          <span>-${formatCurrency(amountPaid, currency)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:15px;font-weight:700;color:${isPaid ? "#16a34a" : primaryColour};font-family:'${headingFamily}',sans-serif;">
          <span>Amount Due</span>
          <span>${formatCurrency(amountDue, currency)}</span>
        </div>` : ""}
      </div>
    </div>

    ${notes ? `
    <!-- Notes -->
    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;position:relative;z-index:1;">
      <p style="margin:0 0 6px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;font-family:'${bodyFamily}',sans-serif;">Notes</p>
      <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;white-space:pre-line;font-family:'${bodyFamily}',sans-serif;">${escapeHtml(notes)}</p>
    </div>` : ""}

  </div>
</body>
</html>`;
}
