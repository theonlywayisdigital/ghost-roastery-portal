import { NextRequest, NextResponse } from "next/server";
import { getMarketingOwner, applyOwnerFilter } from "@/lib/marketing-auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data: code, error } = await applyOwnerFilter(
    supabase.from("discount_codes").select("*").eq("id", id),
    owner
  ).single();

  if (error || !code) {
    return NextResponse.json({ error: "Discount code not found" }, { status: 404 });
  }

  // Get aggregated stats from redemptions
  const { data: redemptions } = await supabase
    .from("discount_redemptions")
    .select("order_value, discount_amount, customer_email")
    .eq("discount_code_id", id);

  const stats = {
    total_uses: redemptions?.length || 0,
    total_discount_given: 0,
    avg_order_value: 0,
    total_revenue: 0,
    unique_customers: 0,
  };

  if (redemptions && redemptions.length > 0) {
    stats.total_discount_given = redemptions.reduce((sum, r) => sum + Number(r.discount_amount), 0);
    stats.total_revenue = redemptions.reduce((sum, r) => sum + Number(r.order_value), 0);
    stats.avg_order_value = stats.total_revenue / redemptions.length;
    stats.unique_customers = new Set(redemptions.map((r) => r.customer_email)).size;
  }

  return NextResponse.json({ code, stats });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const supabase = createServerClient();

    // Verify ownership
    const { data: existing } = await applyOwnerFilter(
      supabase.from("discount_codes").select("id, used_count, code, discount_type").eq("id", id),
      owner
    ).single();

    if (!existing) {
      return NextResponse.json({ error: "Discount code not found" }, { status: 404 });
    }

    // If code has been used, disallow changing code or discount_type
    if (existing.used_count > 0) {
      if ("code" in body && body.code !== existing.code) {
        return NextResponse.json(
          { error: "Cannot change code after it has been redeemed" },
          { status: 400 }
        );
      }
      if ("discount_type" in body && body.discount_type !== existing.discount_type) {
        return NextResponse.json(
          { error: "Cannot change discount type after it has been redeemed" },
          { status: 400 }
        );
      }
    }

    // If auto_apply is being set to true, verify no other active auto_apply exists
    if (body.auto_apply && body.status !== "paused" && body.status !== "archived") {
      const { data: autoApplyExisting } = await applyOwnerFilter(
        supabase.from("discount_codes").select("id"),
        owner
      )
        .eq("auto_apply", true)
        .eq("status", "active")
        .neq("id", id)
        .maybeSingle();

      if (autoApplyExisting) {
        return NextResponse.json(
          { error: "Only one auto-apply code can be active at a time" },
          { status: 400 }
        );
      }
    }

    const allowedFields: Record<string, unknown> = {};
    const editableKeys = [
      "code", "description", "discount_type", "discount_value", "currency",
      "minimum_order_value", "maximum_discount", "applies_to", "product_ids",
      "usage_limit", "usage_per_customer", "starts_at", "expires_at",
      "status", "auto_apply", "first_order_only",
    ];

    for (const key of editableKeys) {
      if (key in body) {
        allowedFields[key] = body[key];
      }
    }

    // Uppercase code if provided
    if (allowedFields.code && typeof allowedFields.code === "string") {
      allowedFields.code = allowedFields.code.toUpperCase().trim();
    }

    const { data: code, error } = await applyOwnerFilter(
      supabase.from("discount_codes").update(allowedFields).eq("id", id),
      owner
    )
      .select()
      .single();

    if (error) {
      console.error("Discount code update error:", error);
      return NextResponse.json({ error: "Failed to update discount code" }, { status: 500 });
    }

    return NextResponse.json({ code });
  } catch (error) {
    console.error("Discount code update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  // Verify ownership and check usage
  const { data: existing } = await applyOwnerFilter(
    supabase.from("discount_codes").select("id, used_count").eq("id", id),
    owner
  ).single();

  if (!existing) {
    return NextResponse.json({ error: "Discount code not found" }, { status: 404 });
  }

  if (existing.used_count > 0) {
    return NextResponse.json(
      { error: "Cannot delete a discount code that has been redeemed. Archive it instead." },
      { status: 400 }
    );
  }

  const { error } = await applyOwnerFilter(
    supabase.from("discount_codes").delete().eq("id", id),
    owner
  );

  if (error) {
    console.error("Discount code delete error:", error);
    return NextResponse.json({ error: "Failed to delete discount code" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
