import { NextRequest, NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { modernMinimalTemplate } from "@/lib/website-templates/modern-minimal";
import { classicTraditionalTemplate } from "@/lib/website-templates/classic-traditional";

export async function POST(request: NextRequest) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Get or create website for this roaster
  let { data: website } = await supabase
    .from("websites")
    .select("id")
    .eq("roaster_id", roaster.id)
    .single();

  if (!website) {
    const subdomain =
      (roaster as Record<string, unknown>).storefront_slug as string ||
      (roaster.business_name || "my-site").toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 50);

    const { data: newWebsite, error } = await supabase
      .from("websites")
      .insert({
        roaster_id: roaster.id,
        name: roaster.business_name || "My Website",
        subdomain,
        is_published: false,
      })
      .select("id")
      .single();

    if (error || !newWebsite) {
      console.error("Website create error:", error);
      return NextResponse.json({ error: "Failed to create website" }, { status: 500 });
    }
    website = newWebsite;
  }

  // Get template from request
  const body = await request.json().catch(() => ({}));
  const template = body.template || "modern-minimal";

  const templatePages =
    template === "classic-traditional"
      ? classicTraditionalTemplate()
      : modernMinimalTemplate();

  // Delete existing pages for this website
  await supabase
    .from("website_pages")
    .delete()
    .eq("website_id", website.id);

  // Update template on website
  await supabase
    .from("websites")
    .update({ template_id: template })
    .eq("id", website.id);

  const pageConfig = [
    { slug: "home", title: "Home" },
    { slug: "shop", title: "Shop" },
    { slug: "about", title: "About" },
    { slug: "contact", title: "Contact" },
    { slug: "wholesale", title: "Wholesale" },
    { slug: "brewing", title: "Brewing Guide" },
  ];

  const pagesToInsert = pageConfig
    .filter((p) => templatePages[p.slug])
    .map((p, i) => ({
      website_id: website.id,
      title: p.title,
      slug: p.slug,
      content: templatePages[p.slug] as unknown as Record<string, unknown>,
      sort_order: i,
      is_published: true,
    }));

  const { error } = await supabase.from("website_pages").insert(pagesToInsert);

  if (error) {
    console.error("Scaffold error:", error);
    return NextResponse.json({ error: "Failed to create pages" }, { status: 500 });
  }

  return NextResponse.json({ success: true, count: pagesToInsert.length });
}
