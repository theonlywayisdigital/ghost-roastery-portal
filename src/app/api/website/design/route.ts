import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: website } = await supabase
    .from("websites")
    .select("id, name, design_settings, template_id")
    .eq("roaster_id", roaster.id)
    .single();

  if (!website) {
    return NextResponse.json({
      settings: null,
      siteName: roaster.business_name || "My Website",
      brandLogoUrl: roaster.brand_logo_url ?? null,
    });
  }

  return NextResponse.json({
    settings: {
      ...(website.design_settings as Record<string, unknown> ?? {}),
      templateId: website.template_id,
    },
    websiteId: website.id,
    siteName: website.name || roaster.business_name || "My Website",
    brandLogoUrl: roaster.brand_logo_url ?? null,
  });
}

export async function PUT(req: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const supabase = createServerClient();

    const { templateId, ...designSettings } = body.settings ?? {};

    const { data: existing } = await supabase
      .from("websites")
      .select("id")
      .eq("roaster_id", roaster.id)
      .single();

    if (existing) {
      const { error } = await supabase
        .from("websites")
        .update({
          design_settings: designSettings,
          template_id: templateId ?? null,
        })
        .eq("id", existing.id);

      if (error) {
        console.error("Design update error:", error);
        return NextResponse.json({ error: "Failed to update design" }, { status: 500 });
      }
    } else {
      const { error } = await supabase
        .from("websites")
        .insert({
          roaster_id: roaster.id,
          name: roaster.business_name || "My Website",
          design_settings: designSettings,
          template_id: templateId ?? null,
        });

      if (error) {
        console.error("Website create error:", error);
        return NextResponse.json({ error: "Failed to create website" }, { status: 500 });
      }
    }

    // Revalidate public website so design changes appear immediately
    revalidatePath("/w", "layout");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Design update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
