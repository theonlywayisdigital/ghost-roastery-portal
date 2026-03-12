import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

const VALID_TRANSITIONS: Record<string, string[]> = {
  Pending: ["In Production"],
  "In Production": ["Dispatched"],
  Dispatched: ["Delivered"],
};

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { status: newStatus } = await request.json();

    if (!newStatus) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get current order
    const { data: order } = await supabase
      .from("ghost_orders")
      .select("id, order_status")
      .eq("id", id)
      .single();

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Validate transition
    const allowed = VALID_TRANSITIONS[order.order_status] || [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Cannot transition from "${order.order_status}" to "${newStatus}"`,
        },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("ghost_orders")
      .update({ order_status: newStatus })
      .eq("id", id);

    if (updateError) {
      console.error("Admin order status update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update order status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("Admin order status update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
