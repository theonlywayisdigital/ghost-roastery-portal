import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roasterId = searchParams.get("roasterId");

  if (!roasterId) {
    return NextResponse.json({ code: null });
  }

  const supabase = createServerClient();

  const { data } = await supabase
    .from("discount_codes")
    .select("code")
    .eq("roaster_id", roasterId)
    .eq("auto_apply", true)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ code: data?.code || null });
}
