import { createServerClient } from "@/lib/supabase";

// ─── Sage OAuth Configuration ──────────────────────────────────────────────

const SAGE_CLIENT_ID = process.env.SAGE_CLIENT_ID || "";
const SAGE_CLIENT_SECRET = process.env.SAGE_CLIENT_SECRET || "";
const SAGE_REDIRECT_URI = process.env.SAGE_REDIRECT_URI || "";

const SAGE_AUTH_URL =
  "https://www.sageone.com/oauth2/auth/central?filter=apiv3.1";
const SAGE_TOKEN_URL = "https://oauth.accounting.sage.com/token";
const SAGE_API_URL = "https://api.accounting.sage.com/v3.1";

const SAGE_SCOPES = "full_access";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SageTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

type SageHeaders = Record<string, string>;

interface Integration {
  id: string;
  roaster_id: string;
  provider: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  tenant_id: string | null;
  is_active: boolean;
  settings: Record<string, unknown>;
}

// ─── OAuth Helpers ──────────────────────────────────────────────────────────

/**
 * Generate the Sage OAuth authorization URL.
 */
export function getSageAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: SAGE_CLIENT_ID,
    redirect_uri: SAGE_REDIRECT_URI,
    scope: SAGE_SCOPES,
    state,
  });
  return `${SAGE_AUTH_URL}&${params.toString()}`;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<SageTokenResponse> {
  const res = await fetch(SAGE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: SAGE_REDIRECT_URI,
      client_id: SAGE_CLIENT_ID,
      client_secret: SAGE_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sage token exchange failed: ${res.status} — ${text}`);
  }

  return res.json();
}

/**
 * Refresh an expired access token.
 */
async function refreshAccessToken(
  refreshToken: string
): Promise<SageTokenResponse> {
  const res = await fetch(SAGE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: SAGE_CLIENT_ID,
      client_secret: SAGE_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sage token refresh failed: ${res.status} — ${text}`);
  }

  return res.json();
}

/**
 * Fetch the Sage business info (used to get organisation name).
 */
export async function fetchSageBusiness(
  accessToken: string
): Promise<{ name: string } | null> {
  const res = await fetch(`${SAGE_API_URL}/business`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) return null;

  const data = await res.json();
  return { name: data.name || data.legal_name || "Sage Business" };
}

// ─── Client Helper ──────────────────────────────────────────────────────────

/**
 * Get authenticated Sage headers for a roaster.
 * Automatically refreshes the token if expired.
 * Returns null if no active integration exists.
 */
export async function getSageClient(
  roasterId: string
): Promise<{ headers: SageHeaders; integration: Integration } | null> {
  const supabase = createServerClient();

  const { data: integration } = await supabase
    .from("roaster_integrations")
    .select("*")
    .eq("roaster_id", roasterId)
    .eq("provider", "sage")
    .eq("is_active", true)
    .single();

  if (!integration || !integration.access_token) {
    return null;
  }

  let accessToken = integration.access_token;

  // Check if token is expired (with 5 min buffer)
  const expiresAt = integration.token_expires_at
    ? new Date(integration.token_expires_at).getTime()
    : 0;
  const isExpired = Date.now() > expiresAt - 5 * 60 * 1000;

  if (isExpired && integration.refresh_token) {
    try {
      const tokens = await refreshAccessToken(integration.refresh_token);
      accessToken = tokens.access_token;

      const newExpiresAt = new Date(
        Date.now() + tokens.expires_in * 1000
      ).toISOString();

      await supabase
        .from("roaster_integrations")
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", integration.id);
    } catch (err) {
      console.error(
        `[sage] Token refresh failed for roaster ${roasterId}:`,
        err
      );

      // Mark integration as inactive — roaster needs to reconnect
      await supabase
        .from("roaster_integrations")
        .update({
          is_active: false,
          settings: {
            ...((integration.settings as Record<string, unknown>) || {}),
            error: "Token refresh failed. Please reconnect Sage.",
            error_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", integration.id);

      return null;
    }
  }

  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    integration: integration as Integration,
  };
}

// ─── Push Helpers ───────────────────────────────────────────────────────────

/**
 * Push or update a contact in Sage.
 * Uses email as the match key to avoid duplicates.
 */
export async function pushContactToSage(
  roasterId: string,
  contact: {
    first_name?: string;
    last_name?: string;
    email?: string | null;
    phone?: string | null;
    business_name?: string | null;
    name?: string;
  },
  business?: {
    name?: string;
    vat_number?: string | null;
    address_line_1?: string | null;
    address_line_2?: string | null;
    city?: string | null;
    postcode?: string | null;
    country?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null
): Promise<{ success: boolean; sageContactId?: string; error?: string }> {
  const client = await getSageClient(roasterId);
  if (!client) return { success: false, error: "No active Sage integration" };

  const contactName =
    business?.name ||
    contact.business_name ||
    contact.name ||
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    "Unknown";

  const sageContact: Record<string, unknown> = {
    contact_type_ids: ["CUSTOMER"],
    name: contactName,
  };

  // Main contact person
  const mainPerson: Record<string, unknown> = {
    name: [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contactName,
    is_main_contact: true,
  };

  if (contact.email || business?.email) {
    mainPerson.email = contact.email || business?.email;
    sageContact.email = contact.email || business?.email;
  }

  if (contact.phone) {
    mainPerson.telephone = contact.phone;
    sageContact.telephone = contact.phone;
  } else if (business?.phone) {
    mainPerson.telephone = business.phone;
    sageContact.telephone = business.phone;
  }

  sageContact.main_contact_person = mainPerson;

  // Address
  if (business?.address_line_1) {
    sageContact.main_address = {
      address_line_1: business.address_line_1,
      address_line_2: business.address_line_2 || "",
      city: business.city || "",
      postal_code: business.postcode || "",
      country_id: "GB",
    };
  }

  // VAT number
  if (business?.vat_number) {
    sageContact.tax_number = business.vat_number;
  }

  try {
    // Try to find existing contact by email first
    if (sageContact.email) {
      const searchRes = await fetch(
        `${SAGE_API_URL}/contacts?email=${encodeURIComponent(sageContact.email as string)}`,
        { headers: client.headers }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const items = searchData.$items || [];
        if (items.length > 0) {
          // Update existing contact
          const existingId = items[0].id;

          const updateRes = await fetch(
            `${SAGE_API_URL}/contacts/${existingId}`,
            {
              method: "PUT",
              headers: client.headers,
              body: JSON.stringify({ contact: sageContact }),
            }
          );

          if (!updateRes.ok) {
            const errText = await updateRes.text();
            console.error(`[sage] Contact update failed:`, errText);
            return { success: false, error: errText };
          }

          return { success: true, sageContactId: existingId };
        }
      }
    }

    // Create new contact
    const res = await fetch(`${SAGE_API_URL}/contacts`, {
      method: "POST",
      headers: client.headers,
      body: JSON.stringify({ contact: sageContact }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[sage] Contact create failed:`, errText);
      return { success: false, error: errText };
    }

    const data = await res.json();
    const sageContactId = data.id;
    return { success: true, sageContactId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[sage] pushContactToSage error:`, message);
    return { success: false, error: message };
  }
}

/**
 * Push or update an invoice in Sage.
 * Also creates/updates the associated contact.
 */
export async function pushInvoiceToSage(
  roasterId: string,
  invoice: {
    invoice_number: string;
    subtotal: number;
    tax_rate?: number;
    tax_amount?: number;
    total: number;
    currency?: string;
    payment_due_date?: string | null;
    issued_date?: string | null;
    notes?: string | null;
    status?: string;
  },
  lineItems: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total?: number;
  }>,
  customer: {
    name?: string;
    email?: string | null;
    business_name?: string | null;
  },
  business?: {
    name?: string;
    vat_number?: string | null;
    address_line_1?: string | null;
    address_line_2?: string | null;
    city?: string | null;
    postcode?: string | null;
    country?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null
): Promise<{ success: boolean; sageInvoiceId?: string; error?: string }> {
  const client = await getSageClient(roasterId);
  if (!client) return { success: false, error: "No active Sage integration" };

  // Ensure contact exists in Sage first
  const contactName =
    business?.name ||
    customer.business_name ||
    customer.name ||
    customer.email ||
    "Unknown Customer";

  let sageContactId: string | undefined;

  if (customer.email) {
    const contactResult = await pushContactToSage(
      roasterId,
      {
        name: contactName,
        email: customer.email,
        business_name: customer.business_name,
      },
      business || null
    );
    sageContactId = contactResult.sageContactId;
  }

  // Resolve ledger account and tax rate from integration settings (fall back to API lookup)
  const settings = (client.integration.settings || {}) as Record<string, unknown>;
  let ledgerAccountId = (settings.sage_sales_ledger_account_id as string) || undefined;
  let taxRateId = (settings.sage_sales_tax_rate_id as string) || undefined;

  // If not cached, fetch from API and cache for next time
  if (!ledgerAccountId || !taxRateId) {
    const fetched = await fetchAndCacheSageAccountCodes(
      roasterId, client.headers, client.integration, invoice.tax_rate || 0
    );
    if (!ledgerAccountId && fetched.ledgerAccountId) ledgerAccountId = fetched.ledgerAccountId;
    if (!taxRateId && fetched.taxRateId) taxRateId = fetched.taxRateId;
  }

  // Build Sage line items
  const sageLineItems = lineItems.map((item) => {
    const line: Record<string, unknown> = {
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
    };
    if (ledgerAccountId) line.ledger_account_id = ledgerAccountId;
    if (taxRateId) line.tax_rate_id = taxRateId;
    return line;
  });

  const sageInvoice: Record<string, unknown> = {
    contact_id: sageContactId || undefined,
    contact_name: !sageContactId ? contactName : undefined,
    invoice_number: invoice.invoice_number,
    invoice_lines: sageLineItems,
    currency_id: "GBP",
    status: "UNPAID",
  };

  if (invoice.payment_due_date) {
    sageInvoice.due_date = invoice.payment_due_date;
  }

  if (invoice.issued_date) {
    sageInvoice.date = invoice.issued_date;
  }

  if (invoice.notes) {
    sageInvoice.notes = invoice.notes;
  }

  try {
    // Check if invoice already exists by invoice number
    const searchRes = await fetch(
      `${SAGE_API_URL}/sales_invoices?search=${encodeURIComponent(invoice.invoice_number)}`,
      { headers: client.headers }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const items = searchData.$items || [];
      const existing = items.find(
        (i: Record<string, unknown>) =>
          i.invoice_number === invoice.invoice_number
      );

      if (existing) {
        const existingId = existing.id;
        const existingStatus = existing.status;

        // Don't update paid/void invoices
        if (existingStatus === "PAID" || existingStatus === "VOID") {
          return { success: true, sageInvoiceId: existingId };
        }

        const updateRes = await fetch(
          `${SAGE_API_URL}/sales_invoices/${existingId}`,
          {
            method: "PUT",
            headers: client.headers,
            body: JSON.stringify({ sales_invoice: sageInvoice }),
          }
        );

        if (!updateRes.ok) {
          const errText = await updateRes.text();
          console.error(`[sage] Invoice update failed:`, errText);
          return { success: false, error: errText };
        }

        return { success: true, sageInvoiceId: existingId };
      }
    }

    // Create new invoice
    const res = await fetch(`${SAGE_API_URL}/sales_invoices`, {
      method: "POST",
      headers: client.headers,
      body: JSON.stringify({ sales_invoice: sageInvoice }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[sage] Invoice create failed:`, errText);
      return { success: false, error: errText };
    }

    const data = await res.json();
    const sageInvoiceId = data.id;
    return { success: true, sageInvoiceId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[sage] pushInvoiceToSage error:`, message);
    return { success: false, error: message };
  }
}

/**
 * Fetch Sage ledger accounts and tax rates, cache preferred values
 * in roaster_integrations.settings for future use.
 */
async function fetchAndCacheSageAccountCodes(
  roasterId: string,
  headers: SageHeaders,
  integration: Integration,
  taxRatePercent: number
): Promise<{ ledgerAccountId?: string; taxRateId?: string }> {
  const supabase = createServerClient();
  const settings = { ...((integration.settings || {}) as Record<string, unknown>) };
  let ledgerAccountId: string | undefined;
  let taxRateId: string | undefined;

  try {
    // Fetch sales ledger accounts
    const ledgerRes = await fetch(
      `${SAGE_API_URL}/ledger_accounts?visible_in=sales`,
      { headers }
    );
    if (ledgerRes.ok) {
      const data = await ledgerRes.json();
      const items = data.$items || [];
      if (items.length > 0) {
        ledgerAccountId = items[0].id;
        settings.sage_sales_ledger_account_id = ledgerAccountId;
        settings.sage_available_ledger_accounts = items.slice(0, 20).map(
          (a: Record<string, unknown>) => ({
            id: a.id,
            name: a.displayed_as || a.name,
          })
        );
      }
    }

    // Fetch tax rates
    const taxRes = await fetch(
      `${SAGE_API_URL}/tax_rates?tax_rate_percentage=${taxRatePercent}`,
      { headers }
    );
    if (taxRes.ok) {
      const data = await taxRes.json();
      const items = data.$items || [];
      if (items.length > 0) {
        taxRateId = items[0].id;
        settings.sage_sales_tax_rate_id = taxRateId;
      }
    }

    // Also fetch all tax rates for the settings UI
    const allTaxRes = await fetch(`${SAGE_API_URL}/tax_rates`, { headers });
    if (allTaxRes.ok) {
      const data = await allTaxRes.json();
      const items = data.$items || [];
      settings.sage_available_tax_rates = items.slice(0, 20).map(
        (r: Record<string, unknown>) => ({
          id: r.id,
          name: r.displayed_as || r.name,
          rate: r.percentage,
        })
      );
    }

    await supabase
      .from("roaster_integrations")
      .update({ settings, updated_at: new Date().toISOString() })
      .eq("id", integration.id);
  } catch (err) {
    console.error(`[sage] Failed to fetch/cache account codes for roaster ${roasterId}:`, err);
  }

  return { ledgerAccountId, taxRateId };
}

/**
 * Record a payment against a Sage invoice.
 */
export async function pushPaymentToSage(
  roasterId: string,
  invoice: {
    invoice_number: string;
  },
  payment: {
    amount: number;
    paid_at?: string;
    reference?: string | null;
  }
): Promise<{ success: boolean; sagePaymentId?: string; error?: string }> {
  const client = await getSageClient(roasterId);
  if (!client) return { success: false, error: "No active Sage integration" };

  try {
    // Find the invoice in Sage by invoice number
    const searchRes = await fetch(
      `${SAGE_API_URL}/sales_invoices?search=${encodeURIComponent(invoice.invoice_number)}`,
      { headers: client.headers }
    );

    if (!searchRes.ok) {
      return { success: false, error: "Failed to find invoice in Sage" };
    }

    const searchData = await searchRes.json();
    const items = searchData.$items || [];
    const sageInvoice = items.find(
      (i: Record<string, unknown>) =>
        i.invoice_number === invoice.invoice_number
    );

    if (!sageInvoice) {
      return {
        success: false,
        error: `Invoice ${invoice.invoice_number} not found in Sage`,
      };
    }

    const sageInvoiceId = sageInvoice.id;

    // Get the bank account for payments (use first bank account)
    const accountsRes = await fetch(
      `${SAGE_API_URL}/bank_accounts`,
      { headers: client.headers }
    );

    let bankAccountId: string | undefined;
    if (accountsRes.ok) {
      const accountsData = await accountsRes.json();
      const bankItems = accountsData.$items || [];
      bankAccountId = bankItems[0]?.id;
    }

    if (!bankAccountId) {
      return {
        success: false,
        error: "No bank account found in Sage for payment allocation",
      };
    }

    const paymentDate = payment.paid_at
      ? payment.paid_at.split("T")[0]
      : new Date().toISOString().split("T")[0];

    const sagePayment: Record<string, unknown> = {
      transaction_type_id: "CUSTOMER_RECEIPT",
      contact_id: sageInvoice.contact_id || sageInvoice.contact?.id,
      bank_account_id: bankAccountId,
      date: paymentDate,
      total_amount: payment.amount,
      allocated_artefacts: [
        {
          artefact_id: sageInvoiceId,
          amount: payment.amount,
        },
      ],
    };

    if (payment.reference) {
      sagePayment.reference = payment.reference;
    }

    const res = await fetch(`${SAGE_API_URL}/contact_payments`, {
      method: "POST",
      headers: client.headers,
      body: JSON.stringify({ contact_payment: sagePayment }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[sage] Payment create failed:`, errText);
      return { success: false, error: errText };
    }

    const data = await res.json();
    const sagePaymentId = data.id;
    return { success: true, sagePaymentId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[sage] pushPaymentToSage error:`, message);
    return { success: false, error: message };
  }
}

// ─── Fire-and-Forget Sync ───────────────────────────────────────────────────

/**
 * Check if a roaster has an active Sage integration with auto-sync enabled.
 * If so, execute the sync function. Fire-and-forget.
 */
export function syncToSage(
  roasterId: string,
  syncFn: () => Promise<void>
): void {
  void (async () => {
    try {
      const supabase = createServerClient();
      const { data: integration } = await supabase
        .from("roaster_integrations")
        .select("id, is_active, settings")
        .eq("roaster_id", roasterId)
        .eq("provider", "sage")
        .eq("is_active", true)
        .single();

      if (!integration) return;

      // Check if auto-sync is enabled (default: true)
      const settings = (integration.settings as Record<string, unknown>) || {};
      if (settings.auto_sync === false) return;

      await syncFn();

      // Update last sync timestamp
      await supabase
        .from("roaster_integrations")
        .update({
          settings: {
            ...settings,
            last_sync_at: new Date().toISOString(),
            last_sync_status: "success",
            error: null,
            error_at: null,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", integration.id);
    } catch (err) {
      console.error(
        `[sage] Sync failed for roaster ${roasterId}:`,
        err instanceof Error ? err.message : err
      );

      // Update last sync status with error
      try {
        const supabase = createServerClient();
        const { data: integration } = await supabase
          .from("roaster_integrations")
          .select("id, settings")
          .eq("roaster_id", roasterId)
          .eq("provider", "sage")
          .single();

        if (integration) {
          const settings =
            (integration.settings as Record<string, unknown>) || {};
          await supabase
            .from("roaster_integrations")
            .update({
              settings: {
                ...settings,
                last_sync_at: new Date().toISOString(),
                last_sync_status: "error",
                error:
                  err instanceof Error ? err.message : "Unknown sync error",
                error_at: new Date().toISOString(),
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", integration.id);
        }
      } catch {
        // Swallow — we're already in error handling
      }
    }
  })();
}
