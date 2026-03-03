/**
 * Invoice HTML generation for print / PDF download.
 * Returns a self-contained HTML string with inline CSS optimised for A4 printing.
 * Supports owner branding (logo, colours, fonts).
 */

import { resolveFontFamily, buildGoogleFontsUrl } from "@/lib/fonts";

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

export interface InvoiceBranding {
  logoUrl?: string | null;
  primaryColour?: string;
  accentColour?: string;
  headingFont?: string;
  bodyFont?: string;
}

export function generateInvoiceHtml(params: {
  ownerName: string;
  ownerAddress: string;
  ownerEmail: string;
  customerName: string;
  invoiceNumber: string;
  issuedDate: string;
  dueDate: string | null;
  lineItems: {
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
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
        ${logoUrl ? `<img src="${logoUrl}" alt="" style="width:48px;height:48px;object-fit:contain;border-radius:6px;">` : ""}
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
