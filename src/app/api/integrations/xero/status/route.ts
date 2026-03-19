import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: integration } = await supabase
    .from("roaster_integrations")
    .select("id, is_active, tenant_id, settings, created_at, updated_at")
    .eq("roaster_id", user.roaster.id)
    .eq("provider", "xero")
    .single();

  if (!integration) {
    return NextResponse.json({ connected: false });
  }

  const settings = (integration.settings as Record<string, unknown>) || {};

  return NextResponse.json({
    connected: true,
    is_active: integration.is_active,
    tenant_name: settings.tenant_name || null,
    auto_sync: settings.auto_sync !== false,
    last_sync_at: settings.last_sync_at || null,
    last_sync_status: settings.last_sync_status || null,
    error: settings.error || null,
    connected_at: settings.connected_at || integration.created_at,
    // Account code settings
    sales_account_code: settings.xero_sales_account_code || null,
    sales_tax_type: settings.xero_sales_tax_type || null,
    available_accounts: settings.xero_available_accounts || null,
    available_tax_types: settings.xero_available_tax_types || null,
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { auto_sync, sales_account_code, sales_tax_type } = body as {
    auto_sync?: boolean;
    sales_account_code?: string;
    sales_tax_type?: string;
  };

  const supabase = createServerClient();

  const { data: integration } = await supabase
    .from("roaster_integrations")
    .select("id, settings")
    .eq("roaster_id", user.roaster.id)
    .eq("provider", "xero")
    .single();

  if (!integration) {
    return NextResponse.json(
      { error: "No Xero integration found" },
      { status: 404 }
    );
  }

  const settings = (integration.settings as Record<string, unknown>) || {};

  if (auto_sync !== undefined) {
    settings.auto_sync = auto_sync;
  }
  if (sales_account_code !== undefined) {
    settings.xero_sales_account_code = sales_account_code;
  }
  if (sales_tax_type !== undefined) {
    settings.xero_sales_tax_type = sales_tax_type;
  }

  const { error } = await supabase
    .from("roaster_integrations")
    .update({
      settings,
      updated_at: new Date().toISOString(),
    })
    .eq("id", integration.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
