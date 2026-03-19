import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("roaster_webhooks")
    .select("*")
    .eq("roaster_id", user.roaster.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to load webhooks" }, { status: 500 });
  }

  return NextResponse.json({ webhooks: data || [] });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { url, events } = body as { url: string; events?: string[] };

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("roaster_webhooks")
    .insert({
      roaster_id: user.roaster.id,
      url,
      events: events && events.length > 0 ? events : null,
    })
    .select()
    .single();

  if (error) {
    console.error("Create webhook error:", error);
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
  }

  return NextResponse.json({ webhook: data });
}
