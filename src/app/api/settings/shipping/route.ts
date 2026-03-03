import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    default_dispatch_time: roaster.default_dispatch_time || "2_business_days",
    dispatch_cutoff_time: roaster.dispatch_cutoff_time || "14:00",
    dispatch_days: roaster.dispatch_days || ["mon", "tue", "wed", "thu", "fri"],
  });
}

export async function PUT(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { default_dispatch_time, dispatch_cutoff_time, dispatch_days } = body;

    const supabase = createServerClient();
    const { error } = await supabase
      .from("partner_roasters")
      .update({
        default_dispatch_time: default_dispatch_time || "2_business_days",
        dispatch_cutoff_time: dispatch_cutoff_time || "14:00",
        dispatch_days: dispatch_days || ["mon", "tue", "wed", "thu", "fri"],
      })
      .eq("id", roaster.id);

    if (error) {
      console.error("Shipping settings update error:", error);
      return NextResponse.json(
        { error: "Failed to update shipping settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Shipping settings update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
