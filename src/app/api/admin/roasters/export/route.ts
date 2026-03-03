import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServerClient();

    // Fetch all roasters
    const { data: roasters, error: roasterError } = await supabase
      .from("partner_roasters")
      .select("*")
      .order("created_at", { ascending: false });

    if (roasterError) {
      console.error("Roasters export error:", roasterError);
      return NextResponse.json(
        { error: "Failed to fetch roasters" },
        { status: 500 }
      );
    }

    // Fetch order counts and revenue grouped by roaster
    const { data: orderStats } = await supabase
      .from("wholesale_orders")
      .select("roaster_id, subtotal");

    // Aggregate order stats per roaster
    const statsMap = new Map<string, { order_count: number; revenue: number }>();
    if (orderStats) {
      for (const order of orderStats) {
        const existing = statsMap.get(order.roaster_id) || {
          order_count: 0,
          revenue: 0,
        };
        existing.order_count += 1;
        existing.revenue += order.subtotal || 0;
        statsMap.set(order.roaster_id, existing);
      }
    }

    // Build CSV
    const headers = [
      "Business Name",
      "Contact Name",
      "Email",
      "Phone",
      "Country",
      "Status",
      "Ghost Roaster",
      "Strikes",
      "Orders",
      "Revenue",
      "Created",
    ];

    const rows = (roasters || []).map((r) => {
      const stats = statsMap.get(r.id) || { order_count: 0, revenue: 0 };
      return [
        r.business_name || "",
        r.contact_name || "",
        r.email || "",
        r.phone || "",
        r.country || "",
        r.is_active ? "Active" : "Inactive",
        r.is_ghost_roaster ? "Yes" : "No",
        String(r.strikes ?? 0),
        String(stats.order_count),
        stats.revenue.toFixed(2),
        r.created_at ? new Date(r.created_at).toISOString().split("T")[0] : "",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="roasters-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Roasters export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
