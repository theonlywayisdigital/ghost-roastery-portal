import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  // Validate format: lowercase, alphanumeric + hyphens, 3-30 chars, no leading/trailing hyphen
  const slugRegex = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;
  if (!slugRegex.test(slug)) {
    return NextResponse.json({
      available: false,
      reason: "Invalid format. Use 3–30 lowercase letters, numbers, and hyphens.",
    });
  }

  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from("roasters")
    .select("id")
    .eq("storefront_slug", slug)
    .neq("id", roaster.id)
    .maybeSingle();

  return NextResponse.json({ available: !existing });
}
