import { createServerClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { resolveFontFamily, buildGoogleFontsUrl } from "@/lib/fonts";

function formatCurrency(amount: number) {
  return `\u00a3${amount.toFixed(2)}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServerClient();

  // Fetch invoice by access token
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("invoice_access_token", token)
    .single();

  if (!invoice) notFound();

  // Update to "viewed" if currently "sent"
  if (invoice.status === "sent") {
    await supabase
      .from("invoices")
      .update({ status: "viewed" })
      .eq("id", invoice.id);
  }

  // Fetch line items
  const { data: lineItems } = await supabase
    .from("invoice_line_items")
    .select("*")
    .eq("invoice_id", invoice.id)
    .order("sort_order", { ascending: true });

  // Fetch owner branding
  let ownerName = "Roastery Platform";
  let ownerAddress = "";
  let ownerEmail = "";
  let logoUrl: string | null = null;
  let primaryColour = "#0f172a";
  let accentColour = "#0f172a";
  let headingFontKey = "inter";
  let bodyFontKey = "inter";
  let buttonColour: string | null = null;
  let buttonTextColour: string | null = null;
  let buttonStyle: "sharp" | "rounded" | "pill" = "rounded";
  let bankName: string | null = null;
  let bankAccountNumber: string | null = null;
  let bankSortCode: string | null = null;
  let paymentInstructions: string | null = null;

  if (invoice.owner_type === "roaster" && invoice.roaster_id) {
    const { data: roaster } = await supabase
      .from("partner_roasters")
      .select(
        "business_name, email, address_line_1, city, postcode, country, brand_logo_url, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, storefront_button_colour, storefront_button_text_colour, storefront_button_style, bank_name, bank_account_number, bank_sort_code, payment_instructions"
      )
      .eq("id", invoice.roaster_id)
      .single();
    if (roaster) {
      ownerName = roaster.business_name;
      ownerEmail = roaster.email;
      ownerAddress = [roaster.address_line_1, roaster.city, roaster.postcode]
        .filter(Boolean)
        .join(", ");
      logoUrl = roaster.brand_logo_url || null;
      primaryColour = roaster.brand_primary_colour || primaryColour;
      accentColour = roaster.brand_accent_colour || accentColour;
      headingFontKey = roaster.brand_heading_font || headingFontKey;
      bodyFontKey = roaster.brand_body_font || bodyFontKey;
      buttonColour = roaster.storefront_button_colour || null;
      buttonTextColour = roaster.storefront_button_text_colour || null;
      if (roaster.storefront_button_style) buttonStyle = roaster.storefront_button_style as "sharp" | "rounded" | "pill";
      bankName = roaster.bank_name || null;
      bankAccountNumber = roaster.bank_account_number || null;
      bankSortCode = roaster.bank_sort_code || null;
      paymentInstructions = roaster.payment_instructions || null;
    }
  } else {
    // Roastery Platform
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("brand_logo_url, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, bank_name, bank_account_number, bank_sort_code, payment_instructions")
      .limit(1)
      .single();
    if (settings) {
      logoUrl = settings.brand_logo_url || null;
      primaryColour = settings.brand_primary_colour || primaryColour;
      accentColour = settings.brand_accent_colour || accentColour;
      headingFontKey = settings.brand_heading_font || headingFontKey;
      bodyFontKey = settings.brand_body_font || bodyFontKey;
      bankName = settings.bank_name || null;
      bankAccountNumber = settings.bank_account_number || null;
      bankSortCode = settings.bank_sort_code || null;
      paymentInstructions = settings.payment_instructions || null;
    }
  }

  const headingFamily = resolveFontFamily(headingFontKey);
  const bodyFamily = resolveFontFamily(bodyFontKey);
  const fontsToLoad = Array.from(new Set([headingFamily, bodyFamily]));
  const googleFontsUrl = buildGoogleFontsUrl(fontsToLoad);

  // Fetch customer info
  let customerName = "";
  if (invoice.customer_id) {
    const { data: person } = await supabase
      .from("people")
      .select("first_name, last_name, email")
      .eq("id", invoice.customer_id)
      .single();
    if (person) {
      customerName = [person.first_name, person.last_name]
        .filter(Boolean)
        .join(" ");
    }
  }
  if (!customerName && invoice.business_id) {
    const { data: biz } = await supabase
      .from("businesses")
      .select("name")
      .eq("id", invoice.business_id)
      .single();
    if (biz) customerName = biz.name;
  }

  const isPaid = invoice.status === "paid";
  const isOverdue = invoice.status === "overdue";
  const isVoid = invoice.status === "void" || invoice.status === "cancelled";

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {googleFontsUrl && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link rel="stylesheet" href={googleFontsUrl} />
      )}

      <div className="min-h-screen bg-slate-50">
        <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
          {/* Status banner */}
          {isPaid && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-center">
              <p className="text-green-800 font-semibold text-lg">
                Paid in Full
              </p>
              {invoice.paid_at && (
                <p className="text-green-600 text-sm">
                  {`Paid on ${formatDate(invoice.paid_at)}`}
                </p>
              )}
            </div>
          )}
          {isOverdue && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-center">
              <p className="text-red-800 font-semibold text-lg">
                Payment Overdue
              </p>
              {invoice.payment_due_date && (
                <p className="text-red-600 text-sm">
                  {`Was due ${formatDate(invoice.payment_due_date)}`}
                </p>
              )}
            </div>
          )}
          {isVoid && (
            <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 mb-6 text-center">
              <p className="text-slate-600 font-semibold text-lg">
                Invoice Voided
              </p>
            </div>
          )}

          {/* Invoice card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Accent bar */}
            <div className="h-1" style={{ backgroundColor: accentColour }} />

            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt=""
                      className="w-12 h-12 object-contain rounded-lg"
                    />
                  )}
                  <div>
                    <h1
                      className="text-2xl font-bold"
                      style={{
                        color: primaryColour,
                        fontFamily: `"${headingFamily}", sans-serif`,
                      }}
                    >
                      {ownerName}
                    </h1>
                    {ownerAddress && (
                      <p
                        className="text-sm text-slate-500 mt-1"
                        style={{ fontFamily: `"${bodyFamily}", sans-serif` }}
                      >
                        {ownerAddress}
                      </p>
                    )}
                    {ownerEmail && (
                      <p
                        className="text-sm text-slate-500"
                        style={{ fontFamily: `"${bodyFamily}", sans-serif` }}
                      >
                        {ownerEmail}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className="text-sm text-slate-500 uppercase tracking-wider"
                    style={{ fontFamily: `"${headingFamily}", sans-serif` }}
                  >
                    Invoice
                  </p>
                  <p
                    className="text-xl font-bold font-mono"
                    style={{
                      color: primaryColour,
                      fontFamily: `"${headingFamily}", sans-serif`,
                    }}
                  >
                    {invoice.invoice_number}
                  </p>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="px-8 py-5 bg-slate-50 border-b border-slate-100">
              <div
                className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm"
                style={{ fontFamily: `"${bodyFamily}", sans-serif` }}
              >
                {customerName && (
                  <div>
                    <p className="text-slate-500">Bill To</p>
                    <p className="font-medium text-slate-900">{customerName}</p>
                  </div>
                )}
                {invoice.issued_date && (
                  <div>
                    <p className="text-slate-500">Issued</p>
                    <p className="font-medium text-slate-900">
                      {formatDate(invoice.issued_date)}
                    </p>
                  </div>
                )}
                {invoice.payment_due_date && (
                  <div>
                    <p className="text-slate-500">Due Date</p>
                    <p
                      className={`font-medium ${isOverdue ? "text-red-600" : "text-slate-900"}`}
                    >
                      {formatDate(invoice.payment_due_date)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Line items */}
            <div className="px-8 py-5" style={{ fontFamily: `"${bodyFamily}", sans-serif` }}>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase pb-3">
                      Description
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase pb-3">
                      Qty
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase pb-3">
                      Price
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase pb-3">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(lineItems || []).map(
                    (item: {
                      id: string;
                      description: string;
                      quantity: number;
                      unit_price: number;
                      total: number;
                    }) => (
                      <tr key={item.id}>
                        <td className="py-3 text-sm text-slate-900">
                          {item.description}
                        </td>
                        <td className="py-3 text-sm text-slate-700 text-right">
                          {item.quantity}
                        </td>
                        <td className="py-3 text-sm text-slate-700 text-right">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="py-3 text-sm font-medium text-slate-900 text-right">
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div
              className="px-8 py-5 border-t border-slate-200"
              style={{ fontFamily: `"${bodyFamily}", sans-serif` }}
            >
              <div className="max-w-xs ml-auto space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="text-slate-900">
                    {formatCurrency(invoice.subtotal)}
                  </span>
                </div>
                {invoice.tax_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">{`Tax (${invoice.tax_rate}%)`}</span>
                    <span className="text-slate-700">
                      {formatCurrency(invoice.tax_amount)}
                    </span>
                  </div>
                )}
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Discount</span>
                    <span className="text-red-600">
                      {`-${formatCurrency(invoice.discount_amount)}`}
                    </span>
                  </div>
                )}
                <div
                  className="flex justify-between text-lg font-bold border-t pt-2"
                  style={{
                    borderColor: primaryColour,
                    color: primaryColour,
                    fontFamily: `"${headingFamily}", sans-serif`,
                  }}
                >
                  <span>Total</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
                {invoice.amount_paid > 0 && !isPaid && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Paid</span>
                      <span className="text-green-600">
                        {`-${formatCurrency(invoice.amount_paid)}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-base font-semibold">
                      <span className="text-slate-900">Amount Due</span>
                      <span className="text-red-600">
                        {formatCurrency(
                          invoice.total - (invoice.amount_paid || 0)
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Pay Now / Bank Details */}
            {!isPaid && !isVoid && (
              <div className="px-8 py-6 bg-slate-50 border-t border-slate-200">
                {invoice.stripe_payment_link_url ? (
                  <div className="text-center">
                    <a
                      href={invoice.stripe_payment_link_url}
                      className="inline-flex items-center gap-2 px-8 py-3 font-semibold hover:opacity-90 transition-opacity"
                      style={{
                        backgroundColor: buttonColour || accentColour,
                        color: buttonTextColour || "#ffffff",
                        borderRadius: buttonStyle === "pill" ? "9999px" : buttonStyle === "sharp" ? "0px" : "6px",
                      }}
                    >
                      Pay Now
                    </a>
                    <p className="text-xs text-slate-500 mt-2">
                      Secure payment via Stripe
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-slate-900 mb-2">
                      Payment Details
                    </p>
                    {bankName || bankAccountNumber || bankSortCode ? (
                      <div className="space-y-1 text-sm text-slate-600">
                        {bankName && <p>{`Bank: ${bankName}`}</p>}
                        {bankSortCode && <p>{`Sort Code: ${bankSortCode}`}</p>}
                        {bankAccountNumber && <p>{`Account: ${bankAccountNumber}`}</p>}
                        <p className="mt-2 text-slate-500">{`Reference: ${invoice.invoice_number}`}</p>
                        {paymentInstructions && (
                          <p className="mt-2 text-slate-500 whitespace-pre-wrap">{paymentInstructions}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600">
                        {`Please make payment via bank transfer. Reference: ${invoice.invoice_number}`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div
                className="px-8 py-5 border-t border-slate-200"
                style={{ fontFamily: `"${bodyFamily}", sans-serif` }}
              >
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  Notes
                </p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              </div>
            )}
          </div>

          {/* Download PDF */}
          <div className="text-center mt-4">
            <a
              href={`/api/invoices/pdf/${token}`}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              download
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download PDF
            </a>
          </div>

          <p
            className="text-center text-xs text-slate-400 mt-4"
            style={{ fontFamily: `"${bodyFamily}", sans-serif` }}
          >
            {`${ownerName} · Powered by Roastery Platform`}
          </p>
        </div>
      </div>
    </>
  );
}
