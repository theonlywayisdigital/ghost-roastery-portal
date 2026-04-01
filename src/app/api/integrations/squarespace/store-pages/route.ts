import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { fetchSquarespaceStorePages } from "@/lib/squarespace";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: connection } = await supabase
    .from("ecommerce_connections")
    .select("id")
    .eq("roaster_id", user.roaster.id)
    .eq("provider", "squarespace")
    .single();

  if (!connection) {
    return NextResponse.json(
      { error: "No Squarespace connection found" },
      { status: 404 }
    );
  }

  try {
    const storePages = await fetchSquarespaceStorePages(connection.id);
    return NextResponse.json({ storePages });
  } catch (err) {
    console.error("[squarespace] Failed to fetch store pages:", err);
    return NextResponse.json(
      { error: "Failed to fetch store pages from Squarespace" },
      { status: 500 }
    );
  }
}
