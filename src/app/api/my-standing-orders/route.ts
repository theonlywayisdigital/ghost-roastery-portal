import { NextResponse } from "next/server";
import { createAuthServerClient, createServerClient } from "@/lib/supabase";

export async function GET() {
  // Authenticate via session cookie (buyer user)
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Fetch all standing orders for this buyer, across all roasters
  const { data, error } = await supabase
    .from("standing_orders")
    .select(
      `*, roasters!inner(id, business_name, brand_logo_url),
       wholesale_access!inner(id, business_name, payment_terms)`
    )
    .eq("buyer_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[my-standing-orders] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch standing orders" },
      { status: 500 }
    );
  }

  // Enrich with product names from items
  const standingOrders = (data || []).map((so) => {
    const items = Array.isArray(so.items) ? so.items : [];
    return {
      ...so,
      items,
    };
  });

  return NextResponse.json({ standingOrders });
}
