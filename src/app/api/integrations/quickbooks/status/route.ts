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
    .eq("provider", "quickbooks")
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
    // QuickBooks account settings
    sales_item_id: settings.quickbooks_sales_item_id || null,
    sales_tax_code_id: settings.quickbooks_sales_tax_code_id || null,
    available_items: settings.quickbooks_available_items || null,
    available_tax_codes: settings.quickbooks_available_tax_codes || null,
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { auto_sync, sales_item_id, sales_tax_code_id } = body as {
    auto_sync?: boolean;
    sales_item_id?: string;
    sales_tax_code_id?: string;
  };

  const supabase = createServerClient();

  const { data: integration } = await supabase
    .from("roaster_integrations")
    .select("id, settings")
    .eq("roaster_id", user.roaster.id)
    .eq("provider", "quickbooks")
    .single();

  if (!integration) {
    return NextResponse.json(
      { error: "No QuickBooks integration found" },
      { status: 404 }
    );
  }

  const settings = (integration.settings as Record<string, unknown>) || {};

  if (auto_sync !== undefined) {
    settings.auto_sync = auto_sync;
  }
  if (sales_item_id !== undefined) {
    settings.quickbooks_sales_item_id = sales_item_id;
  }
  if (sales_tax_code_id !== undefined) {
    settings.quickbooks_sales_tax_code_id = sales_tax_code_id;
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
