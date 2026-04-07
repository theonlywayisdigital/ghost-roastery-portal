import { createServerClient as createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { sendEmailConfirmation } from "@/lib/email";
import { findOrCreatePerson, splitName } from "@/lib/people";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessName, contactName, contactFirstName, contactLastName, email, password, phone, website, country } = body;

    // Support both split fields (preferred) and legacy single contactName
    const resolvedFirstName = contactFirstName || splitName(contactName).firstName;
    const resolvedLastName = contactLastName || splitName(contactName).lastName;
    const resolvedContactName = contactName || [resolvedFirstName, resolvedLastName].filter(Boolean).join(" ");

    if (!businessName || !resolvedContactName || !email || !password) {
      return NextResponse.json(
        { error: "Business name, contact name, email, and password are required" },
        { status: 400 }
      );
    }

    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters with one uppercase letter and one special character" },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists in roasters
    const { data: existing } = await serviceClient
      .from("roasters")
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
          full_name: resolvedContactName,
          first_name: resolvedFirstName,
          last_name: resolvedLastName,
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

    // Ensure public.users row exists with split name
    await serviceClient.from("users").upsert({
      id: authData.user.id,
      email: normalizedEmail,
      first_name: resolvedFirstName,
      last_name: resolvedLastName,
    }, { onConflict: "id" });

    // Create roasters row linked to auth user
    const { data: roaster, error: dbError } = await serviceClient
      .from("roasters")
      .insert({
        email: normalizedEmail,
        password_hash: "supabase_auth", // No longer using bcrypt
        business_name: businessName,
        contact_first_name: resolvedFirstName,
        contact_last_name: resolvedLastName,
        phone: phone || null,
        website: website || null,
        country: country || "GB",
        roaster_slug: slug,
        is_active: true,
        wholesale_enabled: true,
        user_id: authData.user.id,
        sales_tier: "growth",
        marketing_tier: "growth",
      })
      .select()
      .single();

    if (dbError) {
      console.error("Signup DB error:", dbError);
      // Clean up auth user if roasters insert fails
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

    // Seed default pipeline stages for the new roaster (fire-and-forget)
    serviceClient.rpc("seed_default_pipeline_stages", { p_roaster_id: roaster.id }).then(
      ({ error: seedErr }) => { if (seedErr) console.error("Failed to seed pipeline stages:", seedErr); }
    );

    // Create people record + profile + auto-link GR contact/business (fire-and-forget)
    (async () => {
      try {
        // Create/find person
        const peopleId = await findOrCreatePerson(
          serviceClient,
          normalizedEmail,
          resolvedFirstName,
          resolvedLastName,
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

          // Create Roastery Platform contact (for admin CRM)
          await serviceClient.from("contacts").insert({
            owner_type: "ghost_roastery",
            roaster_id: null,
            first_name: resolvedFirstName,
            last_name: resolvedLastName,
            email: normalizedEmail,
            phone: phone || null,
            business_name: businessName,
            types: ["roaster"],
            source: "manual",
            people_id: peopleId,
          });

          // Create Roastery Platform business
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

    // Send confirmation email
    const confirmUrl = `${process.env.NEXT_PUBLIC_PORTAL_URL}/verify-email?token=${token}`;
    try {
      await sendEmailConfirmation(normalizedEmail, resolvedContactName, confirmUrl);
    } catch (err) {
      console.error("Failed to send confirmation email:", err);
    }

    return NextResponse.json({ success: true, requiresVerification: true });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
