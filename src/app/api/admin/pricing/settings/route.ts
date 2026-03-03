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

    const [settingsResult, bracketsResult] = await Promise.all([
      supabase
        .from("builder_settings")
        .select("*")
        .limit(1)
        .single(),
      supabase
        .from("pricing_tier_brackets")
        .select("min_quantity")
        .eq("is_active", true)
        .order("min_quantity", { ascending: true })
        .limit(1)
        .single(),
    ]);

    if (settingsResult.error) {
      console.error("Admin builder settings fetch error:", settingsResult.error);
      return NextResponse.json(
        { error: "Failed to fetch builder settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      settings: {
        ...settingsResult.data,
        min_order_quantity: bracketsResult.data?.min_quantity ?? 25,
      },
    });
  } catch (error) {
    console.error("Admin builder settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { max_order_quantity, wholesale_threshold } = body;

    const updates: Record<string, unknown> = {};

    if (max_order_quantity !== undefined) {
      const val = Number(max_order_quantity);
      if (!Number.isInteger(val) || val < 1) {
        return NextResponse.json(
          { error: "max_order_quantity must be a positive integer" },
          { status: 400 }
        );
      }
      updates.max_order_quantity = val;
    }

    if (wholesale_threshold !== undefined) {
      const val = Number(wholesale_threshold);
      if (!Number.isInteger(val) || val < 1) {
        return NextResponse.json(
          { error: "wholesale_threshold must be a positive integer" },
          { status: 400 }
        );
      }
      updates.wholesale_threshold = val;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No changes provided" },
        { status: 400 }
      );
    }

    updates.updated_by = user.id;

    const supabase = createServerClient();

    const { data: settings, error } = await supabase
      .from("builder_settings")
      .update(updates)
      .not("id", "is", null)
      .select()
      .single();

    if (error) {
      console.error("Admin builder settings update error:", error);
      return NextResponse.json(
        { error: "Failed to update builder settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Admin builder settings update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
