import { createServerClient } from "@/lib/supabase";

// ─── Xero OAuth Configuration ───────────────────────────────────────────────

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID || "";
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET || "";
const XERO_REDIRECT_URI = process.env.XERO_REDIRECT_URI || "";

const XERO_AUTH_URL = "https://login.xero.com/identity/connect/authorize";
const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";
const XERO_API_URL = "https://api.xero.com/api.xro/2.0";
const XERO_CONNECTIONS_URL = "https://api.xero.com/connections";

const XERO_SCOPES = [
  "openid",
  "profile",
  "email",
  "accounting.transactions",
  "accounting.contacts",
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

interface XeroHeaders {
  Authorization: string;
  "Xero-tenant-id": string;
  "Content-Type": string;
}

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
        `[xero] Token refresh failed for roaster ${roasterId}:`,
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

  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Xero-tenant-id": integration.tenant_id,
      "Content-Type": "application/json",
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
        Country: business.country || "UK",
      },
    ];
  }

  // VAT number
  if (business?.vat_number) {
    xeroContact.TaxNumber = business.vat_number;
  }

  try {
    // Try to find existing contact by email first
    if (xeroContact.EmailAddress) {
      const searchRes = await fetch(
        `${XERO_API_URL}/Contacts?where=EmailAddress=="${encodeURIComponent(xeroContact.EmailAddress as string)}"`,
        { headers: client.headers }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.Contacts && searchData.Contacts.length > 0) {
          // Update existing contact
          const existingId = searchData.Contacts[0].ContactID;
          xeroContact.ContactID = existingId;

          const updateRes = await fetch(
            `${XERO_API_URL}/Contacts/${existingId}`,
            {
              method: "POST",
              headers: client.headers,
              body: JSON.stringify({ Contacts: [xeroContact] }),
            }
          );

          if (!updateRes.ok) {
            const errText = await updateRes.text();
            console.error(`[xero] Contact update failed:`, errText);
            return { success: false, error: errText };
          }

          return { success: true, xeroContactId: existingId };
        }
      }
    }

    // Create new contact
    const res = await fetch(`${XERO_API_URL}/Contacts`, {
      method: "POST",
      headers: client.headers,
      body: JSON.stringify({ Contacts: [xeroContact] }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[xero] Contact create failed:`, errText);
      return { success: false, error: errText };
    }

    const data = await res.json();
    const xeroContactId = data.Contacts?.[0]?.ContactID;
    return { success: true, xeroContactId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[xero] pushContactToXero error:`, message);
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
  }
): Promise<{ success: boolean; xeroInvoiceId?: string; error?: string }> {
  const client = await getXeroClient(roasterId);
  if (!client) return { success: false, error: "No active Xero integration" };

  // Ensure contact exists in Xero first
  const contactName =
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
      null
    );
    xeroContactId = contactResult.xeroContactId;
  }

  // Build Xero line items
  const xeroLineItems = lineItems.map((item) => ({
    Description: item.description,
    Quantity: item.quantity,
    UnitAmount: item.unit_price,
    AccountCode: "200", // Default sales revenue account
    TaxType: invoice.tax_rate && invoice.tax_rate > 0 ? "OUTPUT2" : "NONE",
  }));

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

  try {
    // Check if invoice already exists by invoice number
    const searchRes = await fetch(
      `${XERO_API_URL}/Invoices?InvoiceNumbers=${encodeURIComponent(invoice.invoice_number)}`,
      { headers: client.headers }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.Invoices && searchData.Invoices.length > 0) {
        const existingId = searchData.Invoices[0].InvoiceID;
        const existingStatus = searchData.Invoices[0].Status;

        // Don't update paid/voided invoices
        if (existingStatus === "PAID" || existingStatus === "VOIDED") {
          return { success: true, xeroInvoiceId: existingId };
        }

        xeroInvoice.InvoiceID = existingId;

        const updateRes = await fetch(
          `${XERO_API_URL}/Invoices/${existingId}`,
          {
            method: "POST",
            headers: client.headers,
            body: JSON.stringify({ Invoices: [xeroInvoice] }),
          }
        );

        if (!updateRes.ok) {
          const errText = await updateRes.text();
          console.error(`[xero] Invoice update failed:`, errText);
          return { success: false, error: errText };
        }

        return { success: true, xeroInvoiceId: existingId };
      }
    }

    // Create new invoice
    const res = await fetch(`${XERO_API_URL}/Invoices`, {
      method: "POST",
      headers: client.headers,
      body: JSON.stringify({ Invoices: [xeroInvoice] }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[xero] Invoice create failed:`, errText);
      return { success: false, error: errText };
    }

    const data = await res.json();
    const xeroInvoiceId = data.Invoices?.[0]?.InvoiceID;
    return { success: true, xeroInvoiceId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[xero] pushInvoiceToXero error:`, message);
    return { success: false, error: message };
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

    if (!searchRes.ok) {
      return { success: false, error: "Failed to find invoice in Xero" };
    }

    const searchData = await searchRes.json();
    if (!searchData.Invoices || searchData.Invoices.length === 0) {
      return {
        success: false,
        error: `Invoice ${invoice.invoice_number} not found in Xero`,
      };
    }

    const xeroInvoiceId = searchData.Invoices[0].InvoiceID;

    // Get the bank account for payments (use first bank account)
    const accountsRes = await fetch(
      `${XERO_API_URL}/Accounts?where=Type=="BANK"`,
      { headers: client.headers }
    );

    let bankAccountId: string | undefined;
    if (accountsRes.ok) {
      const accountsData = await accountsRes.json();
      bankAccountId = accountsData.Accounts?.[0]?.AccountID;
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

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[xero] Payment create failed:`, errText);
      return { success: false, error: errText };
    }

    const data = await res.json();
    const xeroPaymentId = data.Payments?.[0]?.PaymentID;
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
      const supabase = createServerClient();
      const { data: integration } = await supabase
        .from("roaster_integrations")
        .select("id, is_active, settings")
        .eq("roaster_id", roasterId)
        .eq("provider", "xero")
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
        `[xero] Sync failed for roaster ${roasterId}:`,
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
