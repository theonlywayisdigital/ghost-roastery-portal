import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { findOrCreatePerson } from "@/lib/people";
import { Resend } from "resend";
import { wrapEmailWithBranding, emailButton, EmailBranding } from "@/lib/email-template";
import { checkLimit } from "@/lib/feature-gates";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "Ghost Roastery <noreply@ghostroasting.co.uk>";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const roaster = await getCurrentRoaster();
  if (!user || !roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email, role } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 }
      );
    }

    if (!["admin", "staff"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be admin or staff" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check for existing pending invite
    const { data: existing } = await supabase
      .from("team_invites")
      .select("id")
      .eq("roaster_id", roaster.id)
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "An invite has already been sent to this email" },
        { status: 400 }
      );
    }

    // Check team member limit
    const limitCheck = await checkLimit(roaster.id as string, "teamMembers", 1);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message, upgrade_required: true },
        { status: 403 }
      );
    }

    // Check if already a team member
    const { data: members } = await supabase
      .from("team_members")
      .select("id, user_id")
      .eq("roaster_id", roaster.id);

    if (members) {
      for (const member of members) {
        const { data: authData } = await supabase.auth.admin.getUserById(
          member.user_id
        );
        if (authData?.user?.email?.toLowerCase() === email.toLowerCase()) {
          return NextResponse.json(
            { error: "This person is already a team member" },
            { status: 400 }
          );
        }
      }
    }

    // Create people record for invited email
    findOrCreatePerson(supabase, email.toLowerCase()).catch(() => {});

    // Create invite
    const { data: invite, error } = await supabase
      .from("team_invites")
      .insert({
        roaster_id: roaster.id,
        email: email.toLowerCase(),
        role,
        invited_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Invite create error:", error);
      return NextResponse.json(
        { error: "Failed to create invite" },
        { status: 500 }
      );
    }

    // Fetch roaster branding for email template
    const { data: roasterBranding } = await supabase
      .from("partner_roasters")
      .select("brand_logo_url, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, brand_tagline")
      .eq("id", roaster.id)
      .single();

    const branding: EmailBranding | undefined = roasterBranding ? {
      logoUrl: roasterBranding.brand_logo_url,
      primaryColour: roasterBranding.brand_primary_colour || undefined,
      accentColour: roasterBranding.brand_accent_colour || undefined,
      headingFont: roasterBranding.brand_heading_font || undefined,
      bodyFont: roasterBranding.brand_body_font || undefined,
      tagline: roasterBranding.brand_tagline || undefined,
    } : undefined;

    // Send invite email
    try {
      const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "https://portal.ghostroasting.co.uk";
      const bodyHtml = `
        <h1 style="color:#0f172a;font-size:20px;margin:0 0 16px;">Team Invitation</h1>
        <p style="color:#334155;font-size:15px;line-height:24px;margin:4px 0;">
          You've been invited to join <strong>${roaster.business_name}</strong> as ${role === "admin" ? "an Admin" : "a Staff member"} on Ghost Roastery.
        </p>
        ${emailButton({ href: `${portalUrl}/login`, label: "Accept Invitation", branding })}
        <p style="color:#94a3b8;font-size:13px;margin-top:24px;">
          This invitation expires in 7 days. If you have any questions, reply to this email.
        </p>
      `;

      await resend.emails.send({
        from: FROM_EMAIL,
        to: email.toLowerCase(),
        subject: `You've been invited to join ${roaster.business_name} on Ghost Roastery`,
        html: wrapEmailWithBranding({ body: bodyHtml, businessName: roaster.business_name, branding }),
      });
    } catch (emailError) {
      console.error("Invite email send error:", emailError);
      // Don't fail the whole request if email fails
    }

    return NextResponse.json({ invite });
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
