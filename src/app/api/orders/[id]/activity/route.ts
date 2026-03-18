import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { description } = body as { description: string };

  if (!description?.trim()) {
    return NextResponse.json({ error: "Description required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Verify roaster owns this order
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_channel")
    .eq("id", id)
    .eq("roaster_id", user.roaster.id)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("order_activity_log")
    .insert({
      order_id: id,
      order_type: order.order_channel === "wholesale" ? "wholesale" : "storefront",
      action: "note",
      description: description.trim(),
      actor_id: user.id,
      actor_name: user.roaster.business_name || user.email,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ activity: data });
}
