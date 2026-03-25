import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import {
  getQuickBooksClient,
  pushContactToQuickBooks,
  pushInvoiceToQuickBooks,
} from "@/lib/quickbooks";

/**
 * Temporary test endpoint for QuickBooks sync debugging.
 * Fully awaits pushContactToQuickBooks + pushInvoiceToQuickBooks with a fake test payload
 * and returns the full results as JSON.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roasterId = user.roaster.id;
  const results: Record<string, unknown> = {
    roasterId,
    timestamp: new Date().toISOString(),
  };

  try {
    // 1. Check integration exists
    const supabase = createServerClient();
    const { data: integration, error: integrationError } = await supabase
      .from("roaster_integrations")
      .select(
        "id, is_active, settings, token_expires_at, access_token, tenant_id"
      )
      .eq("roaster_id", roasterId)
      .eq("provider", "quickbooks")
      .single();

    if (!integration) {
      results.integration = {
        found: false,
        error:
          integrationError?.message || "No QuickBooks integration found",
      };
      return NextResponse.json(results);
    }

    const settings =
      (integration.settings as Record<string, unknown>) || {};
    results.integration = {
      found: true,
      id: integration.id,
      is_active: integration.is_active,
      has_access_token: !!integration.access_token,
      has_tenant_id: !!integration.tenant_id,
      tenant_id: integration.tenant_id,
      token_expires_at: integration.token_expires_at,
      token_expired: integration.token_expires_at
        ? Date.now() >
          new Date(integration.token_expires_at).getTime() - 5 * 60 * 1000
        : true,
      minutes_until_expiry: integration.token_expires_at
        ? Math.round(
            (new Date(integration.token_expires_at).getTime() -
              Date.now()) /
              60000
          )
        : null,
      auto_sync: settings.auto_sync !== false,
      last_sync_at: settings.last_sync_at || null,
      last_sync_status: settings.last_sync_status || null,
      error: settings.error || null,
      sales_item_id: settings.quickbooks_sales_item_id || null,
      sales_tax_code_id: settings.quickbooks_sales_tax_code_id || null,
    };

    // 2. Test getQuickBooksClient (token refresh etc.)
    let clientResult: Record<string, unknown>;
    try {
      const client = await getQuickBooksClient(roasterId);
      if (client) {
        clientResult = {
          success: true,
          realmId: client.realmId,
          headers_sent: {
            Authorization: client.headers["Authorization"]
              ? `Bearer ${client.headers["Authorization"].substring(7, 20)}...`
              : "MISSING",
            "Content-Type":
              client.headers["Content-Type"] || "MISSING",
            Accept: client.headers["Accept"] || "MISSING",
          },
        };
      } else {
        clientResult = {
          success: false,
          error: "getQuickBooksClient returned null",
        };
      }
    } catch (err) {
      clientResult = {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
    results.getQuickBooksClient = clientResult;

    if (!clientResult.success) {
      return NextResponse.json(results);
    }

    // 3. Test pushContactToQuickBooks with a test contact
    const testContact = {
      name: "Test Customer (Roastery Platform Debug)",
      first_name: "Test",
      last_name: "Customer",
      email: "test-sync-debug@roasteryplatform.com",
      business_name: "Test Business Ltd",
    };

    let contactResult: Record<string, unknown>;
    try {
      const result = await pushContactToQuickBooks(
        roasterId,
        testContact,
        null
      );
      contactResult = { ...result };
    } catch (err) {
      contactResult = {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
    results.pushContactToQuickBooks = contactResult;

    // 4. Test pushInvoiceToQuickBooks with a fake invoice
    const testInvoice = {
      invoice_number: `TEST-${Date.now().toString(36).toUpperCase()}`,
      subtotal: 25.0,
      tax_rate: 20,
      tax_amount: 5.0,
      total: 30.0,
      currency: "GBP",
      payment_due_date: new Date(Date.now() + 30 * 86400000)
        .toISOString()
        .split("T")[0],
      issued_date: new Date().toISOString().split("T")[0],
      notes: "Test invoice from Roastery Platform debug endpoint",
      status: "sent",
    };

    const testLineItems = [
      {
        description: "Test Product — Debug Sync",
        quantity: 1,
        unit_price: 25.0,
      },
    ];

    const testCustomer = {
      name: "Test Customer (Roastery Platform Debug)",
      email: "test-sync-debug@roasteryplatform.com",
      business_name: "Test Business Ltd",
    };

    let invoiceResult: Record<string, unknown>;
    try {
      const result = await pushInvoiceToQuickBooks(
        roasterId,
        testInvoice,
        testLineItems,
        testCustomer,
        null
      );
      invoiceResult = {
        ...result,
        invoiceNumber: testInvoice.invoice_number,
      };
    } catch (err) {
      invoiceResult = {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
    results.pushInvoiceToQuickBooks = invoiceResult;

    return NextResponse.json(results);
  } catch (err) {
    results.error = err instanceof Error ? err.message : String(err);
    return NextResponse.json(results, { status: 500 });
  }
}
