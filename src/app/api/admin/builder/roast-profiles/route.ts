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
      .from("roast_profiles")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch roast profiles" }, { status: 500 });
    }

    return NextResponse.json({ roastProfiles: data || [] });
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
    const {
      name,
      slug,
      descriptor,
      tasting_notes,
      roast_level,
      is_decaf,
      badge,
      image_url,
      sort_order,
    } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Generate slug from name if not provided
    const resolvedSlug =
      slug && typeof slug === "string" && slug.trim().length > 0
        ? slug.trim()
        : name
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");

    if (!resolvedSlug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    if (roast_level !== undefined && (roast_level < 1 || roast_level > 4)) {
      return NextResponse.json(
        { error: "roast_level must be between 1 and 4" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: roastProfile, error } = await supabase
      .from("roast_profiles")
      .insert({
        name: name.trim(),
        slug: resolvedSlug,
        descriptor: descriptor ?? null,
        tasting_notes: tasting_notes ?? null,
        roast_level: roast_level ?? null,
        is_decaf: is_decaf ?? false,
        badge: badge ?? null,
        image_url: image_url ?? null,
        sort_order: sort_order ?? 0,
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A roast profile with this slug already exists" },
          { status: 409 }
        );
      }
      console.error("Roast profile create error:", error);
      return NextResponse.json({ error: "Failed to create roast profile" }, { status: 500 });
    }

    return NextResponse.json({ roastProfile });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
