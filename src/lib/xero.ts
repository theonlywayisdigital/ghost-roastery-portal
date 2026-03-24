import { createServerClient } from "@/lib/supabase";

// ─── Xero OAuth Configuration ───────────────────────────────────────────────

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID || "";
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET || "";
const XERO_REDIRECT_URI = process.env.XERO_REDIRECT_URI || "";

const XERO_AUTH_URL = "https://login.xero.com/identity/connect/authorize";
const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";
const XERO_API_URL = "https://api.xero.com/api.xro/2.0";
const XERO_CONNECTIONS_URL = "https://api.xero.com/connections";

// Granular scopes required for apps created after 2 March 2026
// See: https://developer.xero.com/documentation/guides/oauth2/scopes/
const XERO_SCOPES = [
  "openid",
  "profile",
  "email",
  "accounting.invoices",
  "accounting.payments",
  "accounting.contacts",
  "accounting.settings",
  "offline_access",
].join(" ");

// ─── Types ──────────────────────────────────────────────────────────────────

interface XeroTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface XeroConnection {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantType: string;
}

type XeroHeaders = Record<string, string>;

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

// ─── Response Helper ────────────────────────────────────────────────────────

/**
 * Safely parse a Xero API response. Checks content-type and status,
 * logs the raw body when it's not JSON, and returns { ok, status, data, rawText, contentType }.
 */
async function parseXeroResponse(
  res: Response,
  label: string
): Promise<{
  ok: boolean;
  status: number;
  data: Record<string, unknown> | null;
  rawText: string;
  contentType: string;
}> {
  const contentType = res.headers.get("content-type") || "";
  const rawText = await res.text();

  if (!contentType.includes("application/json")) {
    console.error(
      `[xero] ${label} | Non-JSON response: status=${res.status} content-type="${contentType}" body=${rawText.substring(0, 2000)}`
    );
    return { ok: false, status: res.status, data: null, rawText, contentType };
  }

  try {
    const data = JSON.parse(rawText);
    return { ok: res.ok, status: res.status, data, rawText, contentType };
  } catch {
    console.error(
      `[xero] ${label} | JSON parse failed: status=${res.status} body=${rawText.substring(0, 2000)}`
    );
    return { ok: false, status: res.status, data: null, rawText, contentType };
  }
}

// ─── OAuth Helpers ──────────────────────────────────────────────────────────

/**
 * Generate the Xero OAuth authorization URL.
 */
export function getXeroAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: XERO_CLIENT_ID,
    redirect_uri: XERO_REDIRECT_URI,
    scope: XERO_SCOPES,
    state,
  });
  return `${XERO_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<XeroTokenResponse> {
  const basicAuth = Buffer.from(
    `${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: XERO_REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Xero token exchange failed: ${res.status} — ${text}`);
  }

  return res.json();
}

/**
 * Refresh an expired access token.
 */
async function refreshAccessToken(
  refreshToken: string
): Promise<XeroTokenResponse> {
  const basicAuth = Buffer.from(
    `${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Xero token refresh failed: ${res.status} — ${text}`);
  }

  return res.json();
}

/**
 * Fetch Xero tenant connections using the access token.
 */
export async function fetchXeroConnections(
  accessToken: string
): Promise<XeroConnection[]> {
  const res = await fetch(XERO_CONNECTIONS_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Xero connections: ${res.status}`);
  }

  return res.json();
}

// ─── Client Helper ──────────────────────────────────────────────────────────

/**
 * Get authenticated Xero headers for a roaster.
 * Automatically refreshes the token if expired.
 * Returns null if no active integration exists.
 */
export async function getXeroClient(
  roasterId: string
): Promise<{ headers: XeroHeaders; integration: Integration } | null> {
  const supabase = createServerClient();

  const { data: integration } = await supabase
    .from("roaster_integrations")
    .select("*")
    .eq("roaster_id", roasterId)
    .eq("provider", "xero")
    .eq("is_active", true)
    .single();

  if (!integration || !integration.access_token || !integration.tenant_id) {
    console.log(`[xero] getXeroClient | roaster=${roasterId} | No active integration found (integration=${!!integration}, access_token=${!!integration?.access_token}, tenant_id=${!!integration?.tenant_id})`);
    return null;
  }

  let accessToken = integration.access_token;

  // Check if token is expired (with 5 min buffer)
  const expiresAt = integration.token_expires_at
    ? new Date(integration.token_expires_at).getTime()
    : 0;
  const isExpired = Date.now() > expiresAt - 5 * 60 * 1000;
  const expiresAtISO = integration.token_expires_at || "unknown";
  const minutesUntilExpiry = Math.round((expiresAt - Date.now()) / 60000);

  console.log(`[xero] getXeroClient | roaster=${roasterId} | token_expires_at=${expiresAtISO} minutesUntilExpiry=${minutesUntilExpiry} isExpired=${isExpired} hasRefreshToken=${!!integration.refresh_token}`);

  if (isExpired && integration.refresh_token) {
    try {
      console.log(`[xero] getXeroClient | roaster=${roasterId} | Refreshing expired token...`);
      const tokens = await refreshAccessToken(integration.refresh_token);
      accessToken = tokens.access_token;

      const newExpiresAt = new Date(
        Date.now() + tokens.expires_in * 1000
      ).toISOString();

      console.log(`[xero] getXeroClient | roaster=${roasterId} | Token refreshed successfully, new expires_at=${newExpiresAt}`);

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
        `[xero] getXeroClient | roaster=${roasterId} | Token refresh FAILED:`,
        err
      );

      // Mark integration as inactive — roaster needs to reconnect
      await supabase
        .from("roaster_integrations")
        .update({
          is_active: false,
          settings: {
            ...((integration.settings as Record<string, unknown>) || {}),
            error: "Token refresh failed. Please reconnect Xero.",
            error_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", integration.id);

      return null;
    }
  }

  console.log(`[xero] getXeroClient | roaster=${roasterId} | Returning valid client with tenant_id=${integration.tenant_id}`);

  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Xero-tenant-id": integration.tenant_id,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    integration: integration as Integration,
  };
}

// ─── Push Helpers ───────────────────────────────────────────────────────────

/**
 * Push or update a contact in Xero.
 * Uses email as the match key to avoid duplicates.
 */
export async function pushContactToXero(
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
): Promise<{ success: boolean; xeroContactId?: string; error?: string }> {
  const client = await getXeroClient(roasterId);
  if (!client) return { success: false, error: "No active Xero integration" };

  const contactName =
    business?.name ||
    contact.business_name ||
    contact.name ||
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    "Unknown";

  const xeroContact: Record<string, unknown> = {
    Name: contactName,
    FirstName: contact.first_name || "",
    LastName: contact.last_name || "",
    EmailAddress: contact.email || business?.email || "",
    IsCustomer: true,
  };

  // Phone numbers
  const phones: Record<string, unknown>[] = [];
  if (contact.phone) {
    phones.push({ PhoneType: "DEFAULT", PhoneNumber: contact.phone });
  }
  if (business?.phone && business.phone !== contact.phone) {
    phones.push({ PhoneType: "OFFICE", PhoneNumber: business.phone });
  }
  if (phones.length > 0) xeroContact.Phones = phones;

  // Addresses
  if (business?.address_line_1) {
    xeroContact.Addresses = [
      {
        AddressType: "STREET",
        AddressLine1: business.address_line_1,
        AddressLine2: business.address_line_2 || "",
        City: business.city || "",
        PostalCode: business.postcode || "",
        Country: business.country || "GB",
      },
    ];
  }

  // VAT number
  if (business?.vat_number) {
    xeroContact.TaxNumber = business.vat_number;
  }

  console.log(`[xero] pushContactToXero | roaster=${roasterId} | contactName="${contactName}" email="${xeroContact.EmailAddress}"`);
  console.log(`[xero] pushContactToXero | Request body:`, JSON.stringify({ Contacts: [xeroContact] }, null, 2));

  try {
    // Try to find existing contact by email first
    if (xeroContact.EmailAddress) {
      const email = xeroContact.EmailAddress as string;
      const searchUrl = `${XERO_API_URL}/Contacts?where=${encodeURIComponent(`EmailAddress=="${email}"`)}`;
      console.log(`[xero] pushContactToXero | Searching existing contact: ${searchUrl}`);
      const searchRes = await fetch(searchUrl, { headers: client.headers });
      const search = await parseXeroResponse(searchRes, "pushContactToXero:search");
      console.log(`[xero] pushContactToXero | Search response: status=${search.status} contentType="${search.contentType}" body=${search.rawText.substring(0, 500)}`);

      if (search.ok && search.data) {
        if (search.data.Contacts && (search.data.Contacts as unknown[]).length > 0) {
          // Update existing contact
          const existingId = (search.data.Contacts as Record<string, unknown>[])[0].ContactID as string;
          xeroContact.ContactID = existingId;
          console.log(`[xero] pushContactToXero | Found existing contact ${existingId}, updating...`);

          const updateBody = JSON.stringify({ Contacts: [xeroContact] });
          console.log(`[xero] pushContactToXero | Update body:`, updateBody.substring(0, 500));
          const updateUrl = `${XERO_API_URL}/Contacts/${existingId}`;
          console.log(`[xero] pushContactToXero | Update URL: ${updateUrl}`);
          const updateRes = await fetch(updateUrl, {
            method: "POST",
            headers: client.headers,
            body: updateBody,
          });

          const update = await parseXeroResponse(updateRes, "pushContactToXero:update");
          console.log(`[xero] pushContactToXero | Update response: status=${update.status} contentType="${update.contentType}" body=${update.rawText.substring(0, 500)}`);

          if (!update.ok) {
            return { success: false, error: `Xero ${update.status}: ${update.rawText.substring(0, 500)}` };
          }

          return { success: true, xeroContactId: existingId };
        } else {
          console.log(`[xero] pushContactToXero | No existing contact found, creating new...`);
        }
      } else if (!search.ok) {
        console.log(`[xero] pushContactToXero | Search failed: status=${search.status} contentType="${search.contentType}", falling through to create`);
      }
    }

    // Create new contact
    const createBody = JSON.stringify({ Contacts: [xeroContact] });
    const createUrl = `${XERO_API_URL}/Contacts`;
    console.log(`[xero] pushContactToXero | Creating new contact at ${createUrl}, body:`, createBody.substring(0, 500));
    const res = await fetch(createUrl, {
      method: "POST",
      headers: client.headers,
      body: createBody,
    });

    const create = await parseXeroResponse(res, "pushContactToXero:create");
    console.log(`[xero] pushContactToXero | Create response: status=${create.status} contentType="${create.contentType}" body=${create.rawText.substring(0, 500)}`);

    if (!create.ok || !create.data) {
      return { success: false, error: `Xero ${create.status}: ${create.rawText.substring(0, 500)}` };
    }

    const xeroContactId = (create.data.Contacts as Record<string, unknown>[] | undefined)?.[0]?.ContactID as string | undefined;
    console.log(`[xero] pushContactToXero | Created contact ${xeroContactId}`);
    return { success: true, xeroContactId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[xero] pushContactToXero | Exception: ${message}`, err);
    return { success: false, error: message };
  }
}

/**
 * Push or update an invoice in Xero.
 * Also creates/updates the associated contact.
 */
export async function pushInvoiceToXero(
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
): Promise<{ success: boolean; xeroInvoiceId?: string; error?: string }> {
  const client = await getXeroClient(roasterId);
  if (!client) return { success: false, error: "No active Xero integration" };

  // Ensure contact exists in Xero first
  const contactName =
    business?.name ||
    customer.business_name ||
    customer.name ||
    customer.email ||
    "Unknown Customer";

  let xeroContactId: string | undefined;

  if (customer.email) {
    const contactResult = await pushContactToXero(
      roasterId,
      {
        name: contactName,
        email: customer.email,
        business_name: customer.business_name,
      },
      business || null
    );
    xeroContactId = contactResult.xeroContactId;
  }

  // Resolve account code and tax type from integration settings (fall back to defaults)
  const settings = (client.integration.settings || {}) as Record<string, unknown>;
  const accountCode = (settings.xero_sales_account_code as string) || "200";
  const defaultTaxType = (settings.xero_sales_tax_type as string) || "OUTPUT2";

  // Build Xero line items
  const xeroLineItems = lineItems.map((item) => ({
    Description: item.description,
    Quantity: item.quantity,
    UnitAmount: item.unit_price,
    AccountCode: accountCode,
    TaxType: invoice.tax_rate && invoice.tax_rate > 0 ? defaultTaxType : "NONE",
  }));

  // On first sync, try to fetch and cache account codes if not yet stored
  if (!settings.xero_sales_account_code) {
    fetchAndCacheXeroAccountCodes(roasterId, client.headers, client.integration).catch(() => {});
  }

  const xeroInvoice: Record<string, unknown> = {
    Type: "ACCREC", // Accounts Receivable
    InvoiceNumber: invoice.invoice_number,
    Contact: xeroContactId
      ? { ContactID: xeroContactId }
      : { Name: contactName },
    LineItems: xeroLineItems,
    Status: "AUTHORISED",
    CurrencyCode: invoice.currency || "GBP",
    LineAmountTypes: "Exclusive",
  };

  if (invoice.payment_due_date) {
    xeroInvoice.DueDate = invoice.payment_due_date;
  }

  if (invoice.issued_date) {
    xeroInvoice.Date = invoice.issued_date;
  }

  if (invoice.notes) {
    xeroInvoice.Reference = invoice.notes;
  }

  console.log(`[xero] pushInvoiceToXero | roaster=${roasterId} | invoice_number="${invoice.invoice_number}" total=${invoice.total} lineItems=${lineItems.length} contactName="${contactName}" xeroContactId=${xeroContactId || "none"}`);
  console.log(`[xero] pushInvoiceToXero | Xero invoice body:`, JSON.stringify({ Invoices: [xeroInvoice] }, null, 2));

  try {
    // Check if invoice already exists by invoice number
    const searchUrl = `${XERO_API_URL}/Invoices?InvoiceNumbers=${encodeURIComponent(invoice.invoice_number)}`;
    console.log(`[xero] pushInvoiceToXero | Searching existing invoice: ${searchUrl}`);
    const searchRes = await fetch(searchUrl, { headers: client.headers });
    const search = await parseXeroResponse(searchRes, "pushInvoiceToXero:search");
    console.log(`[xero] pushInvoiceToXero | Search response: status=${search.status} contentType="${search.contentType}" body=${search.rawText.substring(0, 500)}`);

    if (search.ok && search.data) {
      if (search.data.Invoices && (search.data.Invoices as unknown[]).length > 0) {
        const existing = (search.data.Invoices as Record<string, unknown>[])[0];
        const existingId = existing.InvoiceID as string;
        const existingStatus = existing.Status as string;
        console.log(`[xero] pushInvoiceToXero | Found existing invoice ${existingId} with status=${existingStatus}`);

        // Don't update paid/voided invoices
        if (existingStatus === "PAID" || existingStatus === "VOIDED") {
          console.log(`[xero] pushInvoiceToXero | Skipping update — invoice is ${existingStatus}`);
          return { success: true, xeroInvoiceId: existingId };
        }

        xeroInvoice.InvoiceID = existingId;

        const updateBody = JSON.stringify({ Invoices: [xeroInvoice] });
        const updateUrl = `${XERO_API_URL}/Invoices/${existingId}`;
        console.log(`[xero] pushInvoiceToXero | Updating existing invoice at ${updateUrl}, body:`, updateBody.substring(0, 500));
        const updateRes = await fetch(updateUrl, {
          method: "POST",
          headers: client.headers,
          body: updateBody,
        });

        const update = await parseXeroResponse(updateRes, "pushInvoiceToXero:update");
        console.log(`[xero] pushInvoiceToXero | Update response: status=${update.status} contentType="${update.contentType}" body=${update.rawText.substring(0, 1000)}`);

        if (!update.ok) {
          return { success: false, error: `Xero ${update.status}: ${update.rawText.substring(0, 500)}` };
        }

        return { success: true, xeroInvoiceId: existingId };
      } else {
        console.log(`[xero] pushInvoiceToXero | No existing invoice found, creating new...`);
      }
    } else if (!search.ok) {
      console.log(`[xero] pushInvoiceToXero | Search failed: status=${search.status} contentType="${search.contentType}", falling through to create`);
    }

    // Create new invoice
    const createBody = JSON.stringify({ Invoices: [xeroInvoice] });
    const createUrl = `${XERO_API_URL}/Invoices`;
    console.log(`[xero] pushInvoiceToXero | Creating new invoice at ${createUrl}, body:`, createBody.substring(0, 1000));
    const res = await fetch(createUrl, {
      method: "POST",
      headers: client.headers,
      body: createBody,
    });

    const create = await parseXeroResponse(res, "pushInvoiceToXero:create");
    console.log(`[xero] pushInvoiceToXero | Create response: status=${create.status} contentType="${create.contentType}" body=${create.rawText.substring(0, 1000)}`);

    if (!create.ok || !create.data) {
      return { success: false, error: `Xero ${create.status}: ${create.rawText.substring(0, 500)}` };
    }

    const xeroInvoiceId = (create.data.Invoices as Record<string, unknown>[] | undefined)?.[0]?.InvoiceID as string | undefined;
    console.log(`[xero] pushInvoiceToXero | Created invoice ${xeroInvoiceId}`);
    return { success: true, xeroInvoiceId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[xero] pushInvoiceToXero | Exception: ${message}`, err);
    return { success: false, error: message };
  }
}

/**
 * Fetch Xero chart of accounts and tax rates, then cache preferred values
 * in roaster_integrations.settings for future use.
 */
async function fetchAndCacheXeroAccountCodes(
  roasterId: string,
  headers: XeroHeaders,
  integration: Integration
): Promise<void> {
  const supabase = createServerClient();
  const settings = { ...((integration.settings || {}) as Record<string, unknown>) };

  try {
    // Fetch sales revenue accounts
    const accountsRes = await fetch(
      `${XERO_API_URL}/Accounts?where=${encodeURIComponent('Class=="REVENUE"&&Status=="ACTIVE"')}`,
      { headers }
    );
    const accountsParsed = await parseXeroResponse(accountsRes, "fetchAndCacheXeroAccountCodes:accounts");
    if (accountsParsed.ok && accountsParsed.data) {
      const accounts = (accountsParsed.data.Accounts || []) as Record<string, unknown>[];
      if (accounts.length > 0) {
        // Use the first active revenue account, or one with code "200" if available
        const preferred = accounts.find((a) => a.Code === "200") || accounts[0];
        settings.xero_sales_account_code = preferred.Code;
        settings.xero_available_accounts = accounts.slice(0, 20).map(
          (a) => ({ code: a.Code, name: a.Name })
        );
      }
    }

    // Fetch tax rates
    const taxRes = await fetch(`${XERO_API_URL}/TaxRates`, { headers });
    const taxParsed = await parseXeroResponse(taxRes, "fetchAndCacheXeroAccountCodes:taxRates");
    if (taxParsed.ok && taxParsed.data) {
      const rates = (taxParsed.data.TaxRates || []) as Record<string, unknown>[];
      if (rates.length > 0) {
        // Use OUTPUT2 if available, otherwise first output tax
        const preferred =
          rates.find((r) => r.TaxType === "OUTPUT2") ||
          rates.find((r) => (r.TaxType as string)?.startsWith("OUTPUT")) ||
          rates[0];
        settings.xero_sales_tax_type = preferred.TaxType;
        settings.xero_available_tax_types = rates
          .filter((r) => r.Status === "ACTIVE")
          .slice(0, 20)
          .map((r) => ({
            type: r.TaxType,
            name: r.Name,
            rate: r.EffectiveRate,
          }));
      }
    }

    await supabase
      .from("roaster_integrations")
      .update({ settings, updated_at: new Date().toISOString() })
      .eq("id", integration.id);
  } catch (err) {
    console.error(`[xero] Failed to fetch/cache account codes for roaster ${roasterId}:`, err);
  }
}

/**
 * Record a payment against a Xero invoice.
 */
export async function pushPaymentToXero(
  roasterId: string,
  invoice: {
    invoice_number: string;
  },
  payment: {
    amount: number;
    paid_at?: string;
    reference?: string | null;
  }
): Promise<{ success: boolean; xeroPaymentId?: string; error?: string }> {
  const client = await getXeroClient(roasterId);
  if (!client) return { success: false, error: "No active Xero integration" };

  try {
    // Find the invoice in Xero by invoice number
    const searchRes = await fetch(
      `${XERO_API_URL}/Invoices?InvoiceNumbers=${encodeURIComponent(invoice.invoice_number)}`,
      { headers: client.headers }
    );
    const search = await parseXeroResponse(searchRes, "pushPaymentToXero:searchInvoice");

    if (!search.ok || !search.data) {
      return { success: false, error: `Failed to find invoice in Xero: ${search.status} ${search.rawText.substring(0, 200)}` };
    }

    if (!search.data.Invoices || (search.data.Invoices as unknown[]).length === 0) {
      return {
        success: false,
        error: `Invoice ${invoice.invoice_number} not found in Xero`,
      };
    }

    const xeroInvoiceId = (search.data.Invoices as Record<string, unknown>[])[0].InvoiceID as string;

    // Get the bank account for payments (use first bank account)
    const accountsRes = await fetch(
      `${XERO_API_URL}/Accounts?where=${encodeURIComponent('Type=="BANK"')}`,
      { headers: client.headers }
    );
    const accounts = await parseXeroResponse(accountsRes, "pushPaymentToXero:bankAccounts");

    let bankAccountId: string | undefined;
    if (accounts.ok && accounts.data) {
      bankAccountId = (accounts.data.Accounts as Record<string, unknown>[] | undefined)?.[0]?.AccountID as string | undefined;
    }

    if (!bankAccountId) {
      return {
        success: false,
        error: "No bank account found in Xero for payment allocation",
      };
    }

    const paymentDate = payment.paid_at
      ? payment.paid_at.split("T")[0]
      : new Date().toISOString().split("T")[0];

    const xeroPayment: Record<string, unknown> = {
      Invoice: { InvoiceID: xeroInvoiceId },
      Account: { AccountID: bankAccountId },
      Amount: payment.amount,
      Date: paymentDate,
    };

    if (payment.reference) {
      xeroPayment.Reference = payment.reference;
    }

    const res = await fetch(`${XERO_API_URL}/Payments`, {
      method: "PUT",
      headers: client.headers,
      body: JSON.stringify({ Payments: [xeroPayment] }),
    });

    const paymentResult = await parseXeroResponse(res, "pushPaymentToXero:create");

    if (!paymentResult.ok || !paymentResult.data) {
      console.error(`[xero] Payment create failed: ${paymentResult.status} ${paymentResult.rawText.substring(0, 500)}`);
      return { success: false, error: `Xero ${paymentResult.status}: ${paymentResult.rawText.substring(0, 500)}` };
    }

    const xeroPaymentId = (paymentResult.data.Payments as Record<string, unknown>[] | undefined)?.[0]?.PaymentID as string | undefined;
    return { success: true, xeroPaymentId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[xero] pushPaymentToXero error:`, message);
    return { success: false, error: message };
  }
}

// ─── Fire-and-Forget Sync ───────────────────────────────────────────────────

/**
 * Check if a roaster has an active Xero integration with auto-sync enabled.
 * If so, execute the sync function. Fire-and-forget.
 */
export function syncToXero(
  roasterId: string,
  syncFn: () => Promise<void>
): void {
  void (async () => {
    try {
      console.log(`[xero] syncToXero | roaster=${roasterId} | Looking up integration...`);
      const supabase = createServerClient();
      const { data: integration, error: lookupError } = await supabase
        .from("roaster_integrations")
        .select("id, is_active, settings")
        .eq("roaster_id", roasterId)
        .eq("provider", "xero")
        .eq("is_active", true)
        .single();

      if (!integration) {
        console.log(`[xero] syncToXero | roaster=${roasterId} | No active Xero integration found (error=${lookupError?.message || "no row"}). Skipping.`);
        return;
      }

      // Check if auto-sync is enabled (default: true)
      const settings = (integration.settings as Record<string, unknown>) || {};
      const autoSync = settings.auto_sync !== false;
      console.log(`[xero] syncToXero | roaster=${roasterId} | Integration found: id=${integration.id} auto_sync=${autoSync} is_active=${integration.is_active}`);

      if (!autoSync) {
        console.log(`[xero] syncToXero | roaster=${roasterId} | auto_sync is disabled. Skipping.`);
        return;
      }

      console.log(`[xero] syncToXero | roaster=${roasterId} | Executing sync function...`);
      await syncFn();
      console.log(`[xero] syncToXero | roaster=${roasterId} | Sync function completed successfully.`);

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
        `[xero] syncToXero | roaster=${roasterId} | Sync FAILED:`,
        err instanceof Error ? err.message : err
      );

      // Update last sync status with error
      try {
        const supabase = createServerClient();
        const { data: integration } = await supabase
          .from("roaster_integrations")
          .select("id, settings")
          .eq("roaster_id", roasterId)
          .eq("provider", "xero")
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
