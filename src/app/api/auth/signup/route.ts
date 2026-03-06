import { createServerClient as createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { sendEmailConfirmation } from "@/lib/email";
import { findOrCreatePerson } from "@/lib/people";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessName, contactName, email, password, phone, website, country } = body;

    if (!businessName || !contactName || !email || !password) {
      return NextResponse.json(
        { error: "Business name, contact name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists in partner_roasters
    const { data: existing } = await serviceClient
      .from("partner_roasters")
      .select("id")
      .eq("email", normalizedEmail)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Generate slug from business name
    const slug = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Create auth user via admin API — email NOT confirmed
    const { data: authData, error: authError } =
      await serviceClient.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: false,
        user_metadata: {
          full_name: contactName,
          business_name: businessName,
        },
      });

    if (authError) {
      console.error("Auth signup error:", authError);
      if (authError.message?.includes("already been registered")) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 }
      );
    }

    // Create partner_roasters row linked to auth user
    const { data: roaster, error: dbError } = await serviceClient
      .from("partner_roasters")
      .insert({
        email: normalizedEmail,
        password_hash: "supabase_auth", // No longer using bcrypt
        business_name: businessName,
        contact_name: contactName,
        phone: phone || null,
        website: website || null,
        country: country || "GB",
        roaster_slug: slug,
        is_active: true,
        wholesale_enabled: true,
        user_id: authData.user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Signup DB error:", dbError);
      // Clean up auth user if partner_roasters insert fails
      await serviceClient.auth.admin.deleteUser(authData.user.id);
      if (dbError.code === "23505") {
        return NextResponse.json(
          { error: "An account with this email or business name already exists" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 }
      );
    }

    // Grant roaster role
    await serviceClient.from("user_roles").upsert(
      { user_id: authData.user.id, role_id: "roaster" },
      { onConflict: "user_id,role_id,roaster_id" }
    );

    // Create people record + profile + auto-link GR contact/business (fire-and-forget)
    (async () => {
      try {
        const nameParts = (contactName || "").split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        // Create/find person
        const peopleId = await findOrCreatePerson(
          serviceClient,
          normalizedEmail,
          firstName,
          lastName,
          phone || null
        );

        if (peopleId) {
          // Create profile
          await serviceClient.from("profiles").upsert({
            id: authData.user.id,
            people_id: peopleId,
            role: "roaster_owner",
            associated_roaster_id: roaster.id,
            auth_status: "active",
          }, { onConflict: "id" });

          // Create Ghost Roastery contact (for admin CRM)
          await serviceClient.from("contacts").insert({
            owner_type: "ghost_roastery",
            roaster_id: null,
            first_name: firstName,
            last_name: lastName,
            email: normalizedEmail,
            phone: phone || null,
            business_name: businessName,
            types: ["roaster"],
            source: "manual",
            people_id: peopleId,
            contact_type: "roaster",
          });

          // Create Ghost Roastery business
          await serviceClient.from("businesses").insert({
            owner_type: "ghost_roastery",
            roaster_id: null,
            name: businessName,
            types: ["roaster"],
            email: normalizedEmail,
            phone: phone || null,
            website: website || null,
            country: country || "GB",
            source: "manual",
          });
        }
      } catch (e) {
        console.error("Auto-link on signup error (non-fatal):", e);
      }
    })();

    // Generate email verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    await serviceClient.from("email_verification_tokens").insert({
      user_id: authData.user.id,
      token,
      expires_at: expiresAt,
    });

    // Send confirmation email (fire-and-forget)
    const confirmUrl = `${process.env.NEXT_PUBLIC_PORTAL_URL}/verify-email?token=${token}`;
    sendEmailConfirmation(normalizedEmail, contactName, confirmUrl).catch(
      (err) => console.error("Failed to send confirmation email:", err)
    );

    return NextResponse.json({ success: true, requiresVerification: true });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
