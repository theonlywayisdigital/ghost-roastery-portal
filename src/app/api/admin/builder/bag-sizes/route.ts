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
    const { data, error } = await supabase
      .from("bag_sizes")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch bag sizes" }, { status: 500 });
    }

    return NextResponse.json({ bagSizes: data || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, sort_order } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: bagSize, error } = await supabase
      .from("bag_sizes")
      .insert({
        name: name.trim(),
        description: description ?? null,
        sort_order: sort_order ?? 0,
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A bag size with this name already exists" },
          { status: 409 }
        );
      }
      console.error("Bag size create error:", error);
      return NextResponse.json({ error: "Failed to create bag size" }, { status: 500 });
    }

    return NextResponse.json({ bagSize });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
