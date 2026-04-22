import { NextResponse } from "next/server";
import { createAuthServerClient, createServerClient } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";
import { updateCommittedStock } from "@/lib/standing-orders";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("standing_orders")
    .select(
      `*, roasters!inner(id, business_name, brand_logo_url),
       wholesale_access!inner(id, business_name, payment_terms)`
    )
    .eq("id", id)
    .eq("buyer_user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Standing order not found" },
      { status: 404 }
    );
  }

  // Fetch history
  const { data: history } = await supabase
    .from("standing_order_history")
    .select("id, standing_order_id, order_id, status, generated_at, summary")
    .eq("standing_order_id", id)
    .order("generated_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ standingOrder: data, history: history || [] });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  // Fetch the standing order — must belong to this buyer
  const { data: existing } = await supabase
    .from("standing_orders")
    .select("id, status, buyer_managed, roaster_id, wholesale_access_id, items, frequency, preferred_delivery_day")
    .eq("id", id)
    .eq("buyer_user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: "Standing order not found" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const { action, quantity, frequency, preferredDeliveryDay } = body as {
    action?: "pause" | "resume" | "cancel";
    quantity?: number;
    frequency?: "weekly" | "fortnightly" | "monthly";
    preferredDeliveryDay?: string;
  };

  const update: Record<string, unknown> = {};
  let notificationTitle = "";
  let notificationBody = "";

  if (action === "pause") {
    if (existing.status !== "active") {
      return NextResponse.json(
        { error: "Can only pause an active standing order" },
        { status: 400 }
      );
    }
    update.status = "paused";
    notificationTitle = "Standing order paused by buyer";
    notificationBody = "A buyer has paused their standing order.";
  } else if (action === "resume") {
    if (existing.status !== "paused") {
      return NextResponse.json(
        { error: "Can only resume a paused standing order" },
        { status: 400 }
      );
    }
    update.status = "active";
    notificationTitle = "Standing order resumed by buyer";
    notificationBody = "A buyer has resumed their standing order.";
  } else if (action === "cancel") {
    if (existing.status === "cancelled") {
      return NextResponse.json(
        { error: "Standing order is already cancelled" },
        { status: 400 }
      );
    }
    update.status = "cancelled";
    notificationTitle = "Standing order cancelled by buyer";
    notificationBody = "A buyer has cancelled their standing order.";
  } else {
    // Adjustment — only allowed if buyer_managed
    if (!existing.buyer_managed) {
      return NextResponse.json(
        { error: "This standing order is managed by the roaster. Contact them to make changes." },
        { status: 403 }
      );
    }

    if (existing.status !== "active") {
      return NextResponse.json(
        { error: "Can only adjust an active standing order" },
        { status: 400 }
      );
    }

    const changes: string[] = [];

    if (quantity !== undefined && quantity > 0) {
      // Update quantity on all items
      const items = Array.isArray(existing.items) ? existing.items : [];
      const updatedItems = items.map((item: Record<string, unknown>) => ({
        ...item,
        quantity,
      }));
      update.items = updatedItems;
      changes.push(`quantity to ${quantity}`);
    }

    if (frequency !== undefined) {
      update.frequency = frequency;
      changes.push(`frequency to ${frequency}`);
    }

    if (preferredDeliveryDay !== undefined) {
      update.preferred_delivery_day = preferredDeliveryDay || null;
      changes.push(`delivery day to ${preferredDeliveryDay || "no preference"}`);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "No changes provided" },
        { status: 400 }
      );
    }

    notificationTitle = "Standing order adjusted by buyer";
    notificationBody = `A buyer has adjusted their standing order: ${changes.join(", ")}.`;
  }

  const { error: updateError } = await supabase
    .from("standing_orders")
    .update(update)
    .eq("id", id);

  if (updateError) {
    console.error("[my-standing-orders] PATCH error:", updateError);
    return NextResponse.json(
      { error: "Failed to update standing order" },
      { status: 500 }
    );
  }

  // Recalculate committed stock if items or status changed
  if (update.items || update.status) {
    await updateCommittedStock(supabase, existing.roaster_id);
  }

  // Notify the roaster
  const { data: roaster } = await supabase
    .from("roasters")
    .select("user_id")
    .eq("id", existing.roaster_id)
    .single();

  if (roaster?.user_id && notificationTitle) {
    // Get buyer name for context
    const { data: wa } = await supabase
      .from("wholesale_access")
      .select("business_name")
      .eq("id", existing.wholesale_access_id)
      .single();

    const buyerName = wa?.business_name || "A buyer";
    await createNotification({
      userId: roaster.user_id,
      type: "order_status_updated",
      title: notificationTitle,
      body: notificationBody.replace("A buyer", buyerName),
      link: "/wholesale-buyers?tab=standing",
      metadata: { standing_order_id: id },
    });
  }

  return NextResponse.json({ success: true });
}
