import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import {
  sendWholesaleApplicationReceived,
  sendWholesaleApplicationNotification,
  sendWholesaleApproved,
  sendWholesaleAccountSetup,
} from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { findOrCreatePerson } from "@/lib/people";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      roasterId,
      name,
      email,
      phone,
      businessName,
      businessType,
      businessAddress,
      businessWebsite,
      vatNumber,
      monthlyVolume,
      notes,
    } = body as {
      roasterId: string;
      name: string;
      email: string;
      phone?: string;
      businessName: string;
      businessType?: string;
      businessAddress?: string;
      businessWebsite?: string;
      vatNumber?: string;
      monthlyVolume?: string;
      notes?: string;
    };

    if (!roasterId || !name || !email || !businessName) {
      return NextResponse.json(
        { error: "Name, email, and business name are required." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verify roaster exists and has storefront enabled
    const { data: roaster } = await supabase
      .from("partner_roasters")
      .select("id, user_id, business_name, email, storefront_slug, storefront_enabled, auto_approve_wholesale")
      .eq("id", roasterId)
      .eq("storefront_enabled", true)
      .single();

    if (!roaster) {
      return NextResponse.json(
        { error: "Roaster not found." },
        { status: 404 }
      );
    }

    // Find or create user account (same pattern as confirm-order)
    let userId: string | null = null;
    let isNewUser = false;

    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

    if (existingUser) {
      userId = existingUser.id;
    } else {
      isNewUser = true;
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name: name },
        });

      if (authError) {
        console.error("Failed to create user:", authError);
      } else if (authData.user) {
        userId = authData.user.id;
        await supabase.from("users").insert({
          id: userId,
          email: email.toLowerCase(),
          full_name: name,
        });
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Failed to process application." },
        { status: 500 }
      );
    }

    // Ensure people record exists
    const nameParts = name.split(" ");
    findOrCreatePerson(supabase, email, nameParts[0] || "", nameParts.slice(1).join(" ") || "", phone).catch(() => {});

    // Check for existing wholesale_access record (prevent duplicates)
    const { data: existing } = await supabase
      .from("wholesale_access")
      .select("id, status")
      .eq("user_id", userId)
      .eq("roaster_id", roasterId)
      .maybeSingle();

    if (existing) {
      if (existing.status === "approved") {
        return NextResponse.json(
          { error: "You already have an approved wholesale account with this roaster." },
          { status: 400 }
        );
      }
      if (existing.status === "pending") {
        return NextResponse.json(
          { error: "You already have a pending application with this roaster." },
          { status: 400 }
        );
      }
      // If rejected or suspended, allow reapplication by updating the existing record
      const { error: updateError } = await supabase
        .from("wholesale_access")
        .update({
          status: "pending",
          business_name: businessName,
          business_type: businessType || null,
          business_address: businessAddress || null,
          business_website: businessWebsite || null,
          vat_number: vatNumber || null,
          monthly_volume: monthlyVolume || null,
          notes: notes || null,
          rejected_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Failed to update application:", updateError);
        return NextResponse.json(
          { error: "Failed to submit application." },
          { status: 500 }
        );
      }
    } else {
      // Insert new wholesale_access record
      const { error: insertError } = await supabase
        .from("wholesale_access")
        .insert({
          user_id: userId,
          roaster_id: roasterId,
          status: "pending",
          business_name: businessName,
          business_type: businessType || null,
          business_address: businessAddress || null,
          business_website: businessWebsite || null,
          vat_number: vatNumber || null,
          monthly_volume: monthlyVolume || null,
          notes: notes || null,
        });

      if (insertError) {
        console.error("Failed to create application:", insertError);
        return NextResponse.json(
          { error: "Failed to submit application." },
          { status: 500 }
        );
      }
    }

    // Auto-approve flow
    if (roaster.auto_approve_wholesale) {
      await supabase
        .from("wholesale_access")
        .update({
          status: "approved",
          price_tier: "standard",
          payment_terms: "prepay",
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("roaster_id", roasterId);

      // Grant wholesale_buyer role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role_id", "wholesale_buyer")
        .maybeSingle();

      if (!existingRole) {
        await supabase.from("user_roles").insert({
          user_id: userId,
          role_id: "wholesale_buyer",
        });
      }

      // Send approval email + account setup for new users
      try {
        const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "";
        const wholesaleUrl = `${portalUrl}/s/${roaster.storefront_slug}/wholesale`;

        if (isNewUser && userId) {
          const token = crypto.randomBytes(32).toString("hex");
          const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

          await supabase.from("account_setup_tokens").insert({
            user_id: userId,
            token,
            expires_at: expiresAt,
            roaster_slug: roaster.storefront_slug || null,
          });

          const setupUrl = `${portalUrl}/setup-password?token=${token}`;

          await Promise.all([
            sendWholesaleApproved(email, name, roaster.business_name, "standard", "prepay"),
            sendWholesaleAccountSetup(email, name, roaster.business_name, setupUrl, wholesaleUrl),
          ]);
        } else {
          await sendWholesaleApproved(
            email,
            name,
            roaster.business_name,
            "standard",
            "prepay"
          );
        }
      } catch (emailErr) {
        console.error("Failed to send approval email:", emailErr);
      }

      // Notify the applicant
      if (userId) {
        await createNotification({
          userId,
          type: "wholesale_application",
          title: "Wholesale application approved",
          body: `Your wholesale application with ${roaster.business_name} has been approved.`,
          link: "/wholesale",
        });
      }

      return NextResponse.json({ success: true, status: "approved" });
    }

    // Notify the roaster about the new application
    if (roaster.user_id) {
      await createNotification({
        userId: roaster.user_id,
        type: "wholesale_application",
        title: "New wholesale application",
        body: `${businessName} has applied for wholesale access.`,
        link: "/wholesale-buyers",
        metadata: { business_name: businessName, applicant_email: email },
      });
    }

    // Standard flow: send notification emails
    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "";
    const wholesaleUrl = `${portalUrl}/s/${roaster.storefront_slug}/wholesale`;

    try {
      // For new users, send account setup email (with password link) instead
      // of the plain "application received" email
      if (isNewUser && userId) {
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours

        await supabase.from("account_setup_tokens").insert({
          user_id: userId,
          token,
          expires_at: expiresAt,
          roaster_slug: roaster.storefront_slug || null,
        });

        const setupUrl = `${portalUrl}/setup-password?token=${token}`;

        await Promise.all([
          sendWholesaleAccountSetup(email, name, roaster.business_name, setupUrl, wholesaleUrl),
          sendWholesaleApplicationNotification(
            roaster.email,
            roaster.business_name,
            businessName,
            portalUrl
          ),
        ]);
      } else {
        await Promise.all([
          sendWholesaleApplicationReceived(email, name, roaster.business_name),
          sendWholesaleApplicationNotification(
            roaster.email,
            roaster.business_name,
            businessName,
            portalUrl
          ),
        ]);
      }
    } catch (emailErr) {
      console.error("Failed to send notification emails:", emailErr);
    }

    return NextResponse.json({ success: true, status: "pending" });
  } catch (error) {
    console.error("Wholesale application error:", error);
    return NextResponse.json(
      { error: "Failed to submit application." },
      { status: 500 }
    );
  }
}
