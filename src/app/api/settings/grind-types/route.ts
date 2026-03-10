import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data: grindTypes, error } = await supabase
    .from("roaster_grind_types")
    .select("*")
    .eq("roaster_id", roaster.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Grind types fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch grind types" }, { status: 500 });
  }

  return NextResponse.json({ grindTypes: grindTypes || [] });
}

export async function POST(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, sort_order } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: grindType, error } = await supabase
      .from("roaster_grind_types")
      .insert({
        roaster_id: roaster.id,
        name: name.trim(),
        sort_order: sort_order ?? 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Grind type creation error:", error);
      return NextResponse.json({ error: "Failed to create grind type" }, { status: 500 });
    }

    return NextResponse.json({ grindType }, { status: 201 });
  } catch (error) {
    console.error("Grind type creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
