import { createServerClient } from "@/lib/supabase";

// ─── QuickBooks OAuth Configuration ─────────────────────────────────────────

const QUICKBOOKS_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID || "";
const QUICKBOOKS_CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET || "";
const QUICKBOOKS_REDIRECT_URI = process.env.QUICKBOOKS_REDIRECT_URI || "";

const QUICKBOOKS_AUTH_URL =
  "https://appcenter.intuit.com/connect/oauth2";
const QUICKBOOKS_TOKEN_URL =
  "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

// Use sandbox for localhost, production otherwise
const IS_SANDBOX =
  QUICKBOOKS_REDIRECT_URI.includes("localhost") ||
  process.env.QUICKBOOKS_ENVIRONMENT === "sandbox";

const QUICKBOOKS_API_BASE = IS_SANDBOX
  ? "https://sandbox-quickbooks.api.intuit.com"
  : "https://quickbooks.api.intuit.com";

const QUICKBOOKS_SCOPES =
  "com.intuit.quickbooks.accounting com.intuit.quickbooks.payment openid";

const QUICKBOOKS_MINOR_VERSION = "73";

// ─── Types ──────────────────────────────────────────────────────────────────

interface QBTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

type QBHeaders = Record<string, string>;

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
 * Safely parse a QuickBooks API response. Checks content-type and status,
 * logs the raw body when it's not JSON, and returns { ok, status, data, rawText, contentType }.
 */
async function parseQuickBooksResponse(
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
      `[quickbooks] ${label} | Non-JSON response: status=${res.status} content-type="${contentType}" body=${rawText.substring(0, 2000)}`
    );
    return { ok: false, status: res.status, data: null, rawText, contentType };
  }

  try {
    const data = JSON.parse(rawText);
    return { ok: res.ok, status: res.status, data, rawText, contentType };
  } catch {
    console.error(
      `[quickbooks] ${label} | JSON parse failed: status=${res.status} body=${rawText.substring(0, 2000)}`
    );
    return { ok: false, status: res.status, data: null, rawText, contentType };
  }
}

// ─── Helper: Build API URL ──────────────────────────────────────────────────

function qbUrl(realmId: string, resource: string): string {
  return `${QUICKBOOKS_API_BASE}/v3/company/${realmId}/${resource}?minorversion=${QUICKBOOKS_MINOR_VERSION}`;
}

function qbQueryUrl(realmId: string, query: string): string {
  return `${QUICKBOOKS_API_BASE}/v3/company/${realmId}/query?query=${encodeURIComponent(query)}&minorversion=${QUICKBOOKS_MINOR_VERSION}`;
}

// ─── OAuth Helpers ──────────────────────────────────────────────────────────

/**
 * Generate the QuickBooks OAuth authorization URL.
 */
export function getQuickBooksAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: QUICKBOOKS_CLIENT_ID,
    redirect_uri: QUICKBOOKS_REDIRECT_URI,
    scope: QUICKBOOKS_SCOPES,
    state,
  });
  return `${QUICKBOOKS_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<QBTokenResponse> {
  const basicAuth = Buffer.from(
    `${QUICKBOOKS_CLIENT_ID}:${QUICKBOOKS_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(QUICKBOOKS_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: QUICKBOOKS_REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `QuickBooks token exchange failed: ${res.status} — ${text}`
    );
  }

  return res.json();
}

/**
 * Refresh an expired access token.
 */
async function refreshAccessToken(
  refreshToken: string
): Promise<QBTokenResponse> {
  const basicAuth = Buffer.from(
    `${QUICKBOOKS_CLIENT_ID}:${QUICKBOOKS_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(QUICKBOOKS_TOKEN_URL, {
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
    throw new Error(
      `QuickBooks token refresh failed: ${res.status} — ${text}`
    );
  }

  return res.json();
}

/**
 * Fetch QuickBooks company info (used to get organisation name).
 */
export async function fetchQuickBooksCompanyInfo(
  accessToken: string,
  realmId: string
): Promise<{ companyName: string } | null> {
  const url = qbUrl(realmId, `companyinfo/${realmId}`);
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) return null;

  const data = await res.json();
  const info = data.CompanyInfo || data.companyInfo;
  return {
    companyName:
      info?.CompanyName || info?.LegalName || "QuickBooks Company",
  };
}

// ─── Client Helper ──────────────────────────────────────────────────────────

/**
 * Get authenticated QuickBooks headers for a roaster.
 * Automatically refreshes the token if expired.
 * Returns null if no active integration exists.
 */
export async function getQuickBooksClient(
  roasterId: string
): Promise<{
  headers: QBHeaders;
  realmId: string;
  integration: Integration;
} | null> {
  const supabase = createServerClient();

  const { data: integration } = await supabase
    .from("roaster_integrations")
    .select("*")
    .eq("roaster_id", roasterId)
    .eq("provider", "quickbooks")
    .eq("is_active", true)
    .single();

  if (!integration || !integration.access_token || !integration.tenant_id) {
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
        `[quickbooks] Token refresh failed for roaster ${roasterId}:`,
        err
      );

      // Mark integration as inactive — roaster needs to reconnect
      await supabase
        .from("roaster_integrations")
        .update({
          is_active: false,
          settings: {
            ...((integration.settings as Record<string, unknown>) || {}),
            error: "Token refresh failed. Please reconnect QuickBooks.",
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
      Accept: "application/json",
    },
    realmId: integration.tenant_id,
    integration: integration as Integration,
  };
}

// ─── Push Helpers ───────────────────────────────────────────────────────────

/**
 * Push or update a contact (Customer) in QuickBooks.
 * Uses email as the match key to avoid duplicates.
 */
export async function pushContactToQuickBooks(
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
): Promise<{ success: boolean; qbCustomerId?: string; error?: string }> {
  const client = await getQuickBooksClient(roasterId);
  if (!client)
    return { success: false, error: "No active QuickBooks integration" };

  const displayName =
    business?.name ||
    contact.business_name ||
    contact.name ||
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    "Unknown";

  const qbCustomer: Record<string, unknown> = {
    DisplayName: displayName,
    GivenName: contact.first_name || "",
    FamilyName: contact.last_name || "",
  };

  const email = contact.email || business?.email;
  if (email) {
    qbCustomer.PrimaryEmailAddr = { Address: email };
  }

  const phone = contact.phone || business?.phone;
  if (phone) {
    qbCustomer.PrimaryPhone = { FreeFormNumber: phone };
  }

  if (business?.name || contact.business_name) {
    qbCustomer.CompanyName = business?.name || contact.business_name;
  }

  if (business?.address_line_1) {
    qbCustomer.BillAddr = {
      Line1: business.address_line_1,
      Line2: business.address_line_2 || "",
      City: business.city || "",
      PostalCode: business.postcode || "",
      Country: business.country || "UK",
    };
  }

  try {
    // Try to find existing customer by email
    if (email) {
      const query = `select * from Customer where PrimaryEmailAddr = '${email.replace(/'/g, "\\'")}'`;
      const searchUrl = qbQueryUrl(client.realmId, query);
      const searchRes = await fetch(searchUrl, { headers: client.headers });
      const search = await parseQuickBooksResponse(
        searchRes,
        "pushContactToQuickBooks:search"
      );

      if (search.ok && search.data) {
        const qr = search.data.QueryResponse as Record<string, unknown> | undefined;
        const customers = (qr?.Customer || []) as Record<string, unknown>[];
        if (customers.length > 0) {
          // Update existing customer
          const existing = customers[0];
          const existingId = existing.Id as string;
          qbCustomer.Id = existingId;
          qbCustomer.SyncToken = existing.SyncToken;
          // Preserve DisplayName if it would conflict
          qbCustomer.sparse = true;

          const updateUrl = qbUrl(client.realmId, "customer");
          const updateRes = await fetch(updateUrl, {
            method: "POST",
            headers: client.headers,
            body: JSON.stringify(qbCustomer),
          });

          const update = await parseQuickBooksResponse(
            updateRes,
            "pushContactToQuickBooks:update"
          );

          if (!update.ok) {
            return {
              success: false,
              error: `QuickBooks ${update.status}: ${update.rawText.substring(0, 500)}`,
            };
          }

          return { success: true, qbCustomerId: existingId };
        }
      }
    }

    // Create new customer
    const createUrl = qbUrl(client.realmId, "customer");
    const res = await fetch(createUrl, {
      method: "POST",
      headers: client.headers,
      body: JSON.stringify(qbCustomer),
    });

    const create = await parseQuickBooksResponse(
      res,
      "pushContactToQuickBooks:create"
    );

    if (!create.ok || !create.data) {
      return {
        success: false,
        error: `QuickBooks ${create.status}: ${create.rawText.substring(0, 500)}`,
      };
    }

    const customer = create.data.Customer as Record<string, unknown> | undefined;
    const qbCustomerId = customer?.Id as string | undefined;
    return { success: true, qbCustomerId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[quickbooks] pushContactToQuickBooks error:`, message);
    return { success: false, error: message };
  }
}

/**
 * Push or update an invoice in QuickBooks.
 * Also creates/updates the associated customer.
 */
export async function pushInvoiceToQuickBooks(
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
): Promise<{ success: boolean; qbInvoiceId?: string; error?: string }> {
  const client = await getQuickBooksClient(roasterId);
  if (!client)
    return { success: false, error: "No active QuickBooks integration" };

  // Ensure customer exists in QuickBooks first
  const contactName =
    business?.name ||
    customer.business_name ||
    customer.name ||
    customer.email ||
    "Unknown Customer";

  let qbCustomerId: string | undefined;

  if (customer.email) {
    const contactResult = await pushContactToQuickBooks(
      roasterId,
      {
        name: contactName,
        email: customer.email,
        business_name: customer.business_name,
      },
      business || null
    );
    qbCustomerId = contactResult.qbCustomerId;
  }

  // Resolve item and tax code from integration settings
  const settings = (client.integration.settings || {}) as Record<
    string,
    unknown
  >;
  const salesItemId = settings.quickbooks_sales_item_id as string | undefined;
  const salesTaxCodeId = settings.quickbooks_sales_tax_code_id as
    | string
    | undefined;

  // On first sync, try to fetch and cache account codes if not yet stored
  if (!salesItemId) {
    fetchAndCacheQuickBooksAccountCodes(
      roasterId,
      client.headers,
      client.realmId,
      client.integration
    ).catch(() => {});
  }

  // Build QuickBooks line items
  const qbLineItems = lineItems.map((item, idx) => {
    const line: Record<string, unknown> = {
      DetailType: "SalesItemLineDetail",
      Amount: item.quantity * item.unit_price,
      Description: item.description,
      LineNum: idx + 1,
      SalesItemLineDetail: {
        Qty: item.quantity,
        UnitPrice: item.unit_price,
        ...(salesItemId ? { ItemRef: { value: salesItemId } } : {}),
        ...(salesTaxCodeId
          ? {
              TaxCodeRef: {
                value:
                  invoice.tax_rate && invoice.tax_rate > 0
                    ? salesTaxCodeId
                    : "NON",
              },
            }
          : {}),
      },
    };
    return line;
  });

  const qbInvoice: Record<string, unknown> = {
    DocNumber: invoice.invoice_number,
    CustomerRef: qbCustomerId
      ? { value: qbCustomerId }
      : { value: "1", name: contactName },
    Line: qbLineItems,
    CurrencyRef: { value: invoice.currency || "GBP" },
  };

  if (invoice.payment_due_date) {
    qbInvoice.DueDate = invoice.payment_due_date;
  }

  if (invoice.issued_date) {
    qbInvoice.TxnDate = invoice.issued_date;
  }

  if (invoice.notes) {
    qbInvoice.PrivateNote = invoice.notes;
  }

  try {
    // Check if invoice already exists by DocNumber
    const query = `select * from Invoice where DocNumber = '${invoice.invoice_number.replace(/'/g, "\\'")}'`;
    const searchUrl = qbQueryUrl(client.realmId, query);
    const searchRes = await fetch(searchUrl, { headers: client.headers });
    const search = await parseQuickBooksResponse(
      searchRes,
      "pushInvoiceToQuickBooks:search"
    );

    if (search.ok && search.data) {
      const qr = search.data.QueryResponse as Record<string, unknown> | undefined;
      const invoices = (qr?.Invoice || []) as Record<string, unknown>[];
      if (invoices.length > 0) {
        const existing = invoices[0];
        const existingId = existing.Id as string;
        const balance = existing.Balance as number;

        // Don't update fully paid invoices
        if (balance === 0) {
          return { success: true, qbInvoiceId: existingId };
        }

        qbInvoice.Id = existingId;
        qbInvoice.SyncToken = existing.SyncToken;
        qbInvoice.sparse = true;

        const updateUrl = qbUrl(client.realmId, "invoice");
        const updateRes = await fetch(updateUrl, {
          method: "POST",
          headers: client.headers,
          body: JSON.stringify(qbInvoice),
        });

        const update = await parseQuickBooksResponse(
          updateRes,
          "pushInvoiceToQuickBooks:update"
        );

        if (!update.ok) {
          return {
            success: false,
            error: `QuickBooks ${update.status}: ${update.rawText.substring(0, 500)}`,
          };
        }

        return { success: true, qbInvoiceId: existingId };
      }
    }

    // Create new invoice
    const createUrl = qbUrl(client.realmId, "invoice");
    const res = await fetch(createUrl, {
      method: "POST",
      headers: client.headers,
      body: JSON.stringify(qbInvoice),
    });

    const create = await parseQuickBooksResponse(
      res,
      "pushInvoiceToQuickBooks:create"
    );

    if (!create.ok || !create.data) {
      return {
        success: false,
        error: `QuickBooks ${create.status}: ${create.rawText.substring(0, 500)}`,
      };
    }

    const createdInvoice = create.data.Invoice as Record<string, unknown> | undefined;
    const qbInvoiceId = createdInvoice?.Id as string | undefined;
    return { success: true, qbInvoiceId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[quickbooks] pushInvoiceToQuickBooks error:`, message);
    return { success: false, error: message };
  }
}

/**
 * Fetch QuickBooks items and tax codes, then cache preferred values
 * in roaster_integrations.settings for future use.
 */
async function fetchAndCacheQuickBooksAccountCodes(
  roasterId: string,
  headers: QBHeaders,
  realmId: string,
  integration: Integration
): Promise<void> {
  const supabase = createServerClient();
  const settings = {
    ...((integration.settings || {}) as Record<string, unknown>),
  };

  try {
    // Fetch service items
    const itemsQuery = "select * from Item where Type = 'Service'";
    const itemsUrl = qbQueryUrl(realmId, itemsQuery);
    const itemsRes = await fetch(itemsUrl, { headers });
    const itemsParsed = await parseQuickBooksResponse(
      itemsRes,
      "fetchAndCacheQuickBooksAccountCodes:items"
    );
    if (itemsParsed.ok && itemsParsed.data) {
      const qr = itemsParsed.data.QueryResponse as Record<string, unknown> | undefined;
      const items = (qr?.Item || []) as Record<string, unknown>[];
      if (items.length > 0) {
        settings.quickbooks_sales_item_id = items[0].Id;
        settings.quickbooks_available_items = items.slice(0, 20).map(
          (i) => ({ id: i.Id, name: i.Name })
        );
      }
    }

    // Fetch tax codes
    const taxQuery = "select * from TaxCode";
    const taxUrl = qbQueryUrl(realmId, taxQuery);
    const taxRes = await fetch(taxUrl, { headers });
    const taxParsed = await parseQuickBooksResponse(
      taxRes,
      "fetchAndCacheQuickBooksAccountCodes:taxCodes"
    );
    if (taxParsed.ok && taxParsed.data) {
      const qr = taxParsed.data.QueryResponse as Record<string, unknown> | undefined;
      const taxCodes = (qr?.TaxCode || []) as Record<string, unknown>[];
      if (taxCodes.length > 0) {
        // Prefer the first active taxable code
        const preferred =
          taxCodes.find((tc) => tc.Active === true && tc.Name !== "Non") ||
          taxCodes[0];
        settings.quickbooks_sales_tax_code_id = preferred.Id;
        settings.quickbooks_available_tax_codes = taxCodes
          .filter((tc) => tc.Active !== false)
          .slice(0, 20)
          .map((tc) => ({ id: tc.Id, name: tc.Name }));
      }
    }

    await supabase
      .from("roaster_integrations")
      .update({ settings, updated_at: new Date().toISOString() })
      .eq("id", integration.id);
  } catch (err) {
    console.error(
      `[quickbooks] Failed to fetch/cache account codes for roaster ${roasterId}:`,
      err
    );
  }
}

/**
 * Record a payment against a QuickBooks invoice.
 */
export async function pushPaymentToQuickBooks(
  roasterId: string,
  invoice: {
    invoice_number: string;
  },
  payment: {
    amount: number;
    paid_at?: string;
    reference?: string | null;
  }
): Promise<{ success: boolean; qbPaymentId?: string; error?: string }> {
  const client = await getQuickBooksClient(roasterId);
  if (!client)
    return { success: false, error: "No active QuickBooks integration" };

  try {
    // Find the invoice in QuickBooks by DocNumber
    const query = `select * from Invoice where DocNumber = '${invoice.invoice_number.replace(/'/g, "\\'")}'`;
    const searchUrl = qbQueryUrl(client.realmId, query);
    const searchRes = await fetch(searchUrl, { headers: client.headers });
    const search = await parseQuickBooksResponse(
      searchRes,
      "pushPaymentToQuickBooks:searchInvoice"
    );

    if (!search.ok || !search.data) {
      return {
        success: false,
        error: `Failed to find invoice in QuickBooks: ${search.status} ${search.rawText.substring(0, 200)}`,
      };
    }

    const qr = search.data.QueryResponse as Record<string, unknown> | undefined;
    const invoices = (qr?.Invoice || []) as Record<string, unknown>[];
    if (invoices.length === 0) {
      return {
        success: false,
        error: `Invoice ${invoice.invoice_number} not found in QuickBooks`,
      };
    }

    const qbInvoice = invoices[0];
    const qbInvoiceId = qbInvoice.Id as string;
    const customerRef = qbInvoice.CustomerRef as Record<string, unknown>;

    const paymentDate = payment.paid_at
      ? payment.paid_at.split("T")[0]
      : new Date().toISOString().split("T")[0];

    const qbPayment: Record<string, unknown> = {
      CustomerRef: customerRef,
      TotalAmt: payment.amount,
      TxnDate: paymentDate,
      Line: [
        {
          Amount: payment.amount,
          LinkedTxn: [
            {
              TxnId: qbInvoiceId,
              TxnType: "Invoice",
            },
          ],
        },
      ],
    };

    if (payment.reference) {
      qbPayment.PrivateNote = payment.reference;
    }

    const createUrl = qbUrl(client.realmId, "payment");
    const res = await fetch(createUrl, {
      method: "POST",
      headers: client.headers,
      body: JSON.stringify(qbPayment),
    });

    const paymentResult = await parseQuickBooksResponse(
      res,
      "pushPaymentToQuickBooks:create"
    );

    if (!paymentResult.ok || !paymentResult.data) {
      console.error(
        `[quickbooks] Payment create failed: ${paymentResult.status} ${paymentResult.rawText.substring(0, 500)}`
      );
      return {
        success: false,
        error: `QuickBooks ${paymentResult.status}: ${paymentResult.rawText.substring(0, 500)}`,
      };
    }

    const createdPayment = paymentResult.data.Payment as Record<string, unknown> | undefined;
    const qbPaymentId = createdPayment?.Id as string | undefined;
    return { success: true, qbPaymentId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[quickbooks] pushPaymentToQuickBooks error:`, message);
    return { success: false, error: message };
  }
}

// ─── Fire-and-Forget Sync ───────────────────────────────────────────────────

/**
 * Check if a roaster has an active QuickBooks integration with auto-sync enabled.
 * If so, execute the sync function. Fire-and-forget.
 */
export function syncToQuickBooks(
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
        .eq("provider", "quickbooks")
        .eq("is_active", true)
        .single();

      if (!integration) return;

      // Check if auto-sync is enabled (default: true)
      const settings =
        (integration.settings as Record<string, unknown>) || {};
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
        `[quickbooks] Sync failed for roaster ${roasterId}:`,
        err instanceof Error ? err.message : err
      );

      // Update last sync status with error
      try {
        const supabase = createServerClient();
        const { data: integration } = await supabase
          .from("roaster_integrations")
          .select("id, settings")
          .eq("roaster_id", roasterId)
          .eq("provider", "quickbooks")
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
