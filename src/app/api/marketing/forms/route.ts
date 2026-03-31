import { NextRequest, NextResponse } from "next/server";
import { getMarketingOwner, applyOwnerFilter } from "@/lib/marketing-auth";
import { createServerClient } from "@/lib/supabase";
import { checkLimit } from "@/lib/feature-gates";

export async function GET(request: NextRequest) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: forms, error } = await applyOwnerFilter(
    supabase.from("forms").select("*"),
    owner
  ).order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch forms" }, { status: 500 });
  }

  return NextResponse.json({ forms: forms || [] });
}

export async function POST(request: NextRequest) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check embedded forms limit
    if (owner.owner_id) {
      const limitCheck = await checkLimit(owner.owner_id, "embeddedForms", 1);
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { error: limitCheck.message, upgrade_required: true },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const supabase = createServerClient();

    // Fetch branding details if owner is a roaster
    let accentColour = "#2563eb";
    let logoUrl: string | null = null;
    if (owner.owner_type === "roaster" && owner.owner_id) {
      const { data: roasterData } = await supabase
        .from("roasters")
        .select("storefront_accent_colour, storefront_logo_url")
        .eq("id", owner.owner_id)
        .single();
      if (roasterData) {
        accentColour = roasterData.storefront_accent_colour || "#2563eb";
        logoUrl = roasterData.storefront_logo_url || null;
      }
    }

    const { data: form, error } = await supabase
      .from("forms")
      .insert({
        roaster_id: owner.owner_id,
        name: body.name || "Untitled Form",
        description: body.description || null,
        form_type: body.form_type || "custom",
        fields: body.fields || [],
        settings: body.settings || {
          success_message: "Thanks for your submission!",
          double_opt_in: body.form_type === "newsletter",
          notification_email: true,
          auto_create_contact: true,
          auto_create_business: body.form_type === "wholesale_enquiry",
          default_contact_type: "lead",
          gdpr_consent_text: `I agree to receive communications from ${owner.display_name}. You can unsubscribe at any time.`,
          gdpr_consent_required: true,
        },
        branding: body.branding || {
          background_colour: "#ffffff",
          text_colour: "#1e293b",
          accent_colour: accentColour,
          button_colour: accentColour,
          button_text_colour: "#ffffff",
          font_family: "system-ui",
          border_radius: 8,
          logo_url: logoUrl,
          show_powered_by: true,
        },
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      console.error("Create form error:", error);
      return NextResponse.json({ error: "Failed to create form" }, { status: 500 });
    }

    return NextResponse.json({ form });
  } catch (error) {
    console.error("Create form error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
