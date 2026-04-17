import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import {
  sendWholesaleApplicationReceived,
  sendWholesaleApplicationNotification,
  sendWholesaleApproved,
  sendWholesaleAccountSetup,
  type EmailBranding,
} from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { findOrCreatePerson, splitName } from "@/lib/people";
import crypto from "crypto";
import { dispatchWebhook } from "@/lib/webhooks";
import { syncToXero, pushContactToXero } from "@/lib/xero";
import { syncToSage, pushContactToSage } from "@/lib/sage";
import { syncToQuickBooks, pushContactToQuickBooks } from "@/lib/quickbooks";
import { getStorefrontUrl } from "@/lib/storefront-url";

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
      addressLine1,
      addressLine2,
      addressCity,
      addressCounty,
      addressPostcode,
      businessWebsite,
      vatNumber,
      monthlyVolume,
      notes,
      // Legacy single field fallback
      businessAddress: legacyBusinessAddress,
    } = body as {
      roasterId: string;
      name: string;
      email: string;
      phone?: string;
      businessName: string;
      businessType?: string;
      addressLine1?: string;
      addressLine2?: string;
      addressCity?: string;
      addressCounty?: string;
      addressPostcode?: string;
      businessAddress?: string;
      businessWebsite?: string;
      vatNumber?: string;
      monthlyVolume?: string;
      notes?: string;
    };

    // Resolve structured address fields (fallback to legacy single field for address_line_1)
    const bizAddressLine1 = addressLine1 || legacyBusinessAddress || null;
    const bizAddressLine2 = addressLine2 || null;
    const bizCity = addressCity || null;
    const bizCounty = addressCounty || null;
    const bizPostcode = addressPostcode || null;
    const hasAddress = !!(bizAddressLine1 || bizCity || bizPostcode);
    const businessAddressText = [bizAddressLine1, bizAddressLine2, bizCity, bizCounty, bizPostcode].filter(Boolean).join(", ") || null;

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
      .from("roasters")
      .select("id, user_id, business_name, email, storefront_slug, storefront_enabled, auto_approve_wholesale, auto_approve_payment_terms, brand_logo_url, storefront_logo_size, storefront_button_colour, storefront_button_text_colour, storefront_button_style, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, brand_tagline")
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
          email: email.toLowerCase(),
          email_confirm: true,
          user_metadata: { full_name: name },
        });

      if (authError) {
        console.error("Failed to create user:", authError);
      } else if (authData.user) {
        userId = authData.user.id;
        // Trigger may auto-create public.users — upsert to be safe
        await supabase.from("users").upsert({
          id: userId,
          email: email.toLowerCase(),
          first_name: splitName(name).firstName,
          last_name: splitName(name).lastName,
        }, { onConflict: "id" });
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Failed to process application." },
        { status: 500 }
      );
    }

    // Ensure people record exists
    const { firstName, lastName } = splitName(name);
    const peopleId = await findOrCreatePerson(supabase, email, firstName, lastName, phone);

    // Find or create business record
    let businessId: string | null = null;
    const { data: existingBiz } = await supabase
      .from("businesses")
      .select("id")
      .eq("roaster_id", roasterId)
      .ilike("name", businessName)
      .maybeSingle();

    if (existingBiz) {
      businessId = existingBiz.id;
    } else {
      const { data: newBiz } = await supabase
        .from("businesses")
        .insert({
          name: businessName,
          types: ["wholesale"],
          industry: businessType || null,
          address_line_1: bizAddressLine1,
          address_line_2: bizAddressLine2,
          city: bizCity,
          county: bizCounty,
          postcode: bizPostcode,
          website: businessWebsite || null,
          source: "wholesale_application",
          roaster_id: roasterId,
        })
        .select("id")
        .single();

      if (newBiz) businessId = newBiz.id;
    }

    // Find or create contact record
    const { data: existingContact } = await supabase
      .from("contacts")
      .select("id, types, business_id, user_id")
      .eq("roaster_id", roasterId)
      .eq("email", email.toLowerCase())
      .maybeSingle();

    let contactId: string | null = null;

    if (existingContact) {
      contactId = existingContact.id;
      const currentTypes = (existingContact.types as string[]) || [];
      const updates: Record<string, unknown> = {};
      if (!currentTypes.includes("wholesale")) {
        updates.types = [...currentTypes, "wholesale"];
      }
      if (!existingContact.business_id && businessId) {
        updates.business_id = businessId;
      }
      if (!existingContact.user_id && userId) {
        updates.user_id = userId;
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from("contacts").update(updates).eq("id", existingContact.id);
      }
    } else {
      const { data: newContact } = await supabase
        .from("contacts")
        .insert({
          first_name: firstName,
          last_name: lastName,
          email: email.toLowerCase(),
          phone: phone || null,
          types: ["wholesale"],
          source: "wholesale_application",
          status: "lead",
          business_id: businessId,
          business_name: businessName,
          user_id: userId,
          roaster_id: roasterId,
          people_id: peopleId,
        })
        .select("id")
        .single();

      if (newContact) contactId = newContact.id;
    }

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
          business_address: businessAddressText,
          business_website: businessWebsite || null,
          vat_number: vatNumber || null,
          monthly_volume: monthlyVolume || null,
          notes: notes || null,
          business_id: businessId,
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
          business_address: businessAddressText,
          business_website: businessWebsite || null,
          vat_number: vatNumber || null,
          monthly_volume: monthlyVolume || null,
          notes: notes || null,
          business_id: businessId,
        });

      if (insertError) {
        console.error("Failed to create application:", insertError);
        return NextResponse.json(
          { error: "Failed to submit application." },
          { status: 500 }
        );
      }
    }

    // Seed a buyer_addresses record from the application address
    if (hasAddress) {
      // Get the wholesale_access record ID
      const { data: waRecord } = await supabase
        .from("wholesale_access")
        .select("id")
        .eq("user_id", userId)
        .eq("roaster_id", roasterId)
        .single();

      if (waRecord) {
        // Check no address already exists for this buyer+roaster
        const { data: existingAddr } = await supabase
          .from("buyer_addresses")
          .select("id")
          .eq("user_id", userId)
          .eq("roaster_id", roasterId)
          .limit(1)
          .maybeSingle();

        if (!existingAddr) {
          await supabase.from("buyer_addresses").insert({
            roaster_id: roasterId,
            user_id: userId,
            wholesale_access_id: waRecord.id,
            label: "Business",
            address_line_1: bizAddressLine1 || "",
            address_line_2: bizAddressLine2,
            city: bizCity || "",
            county: bizCounty,
            postcode: bizPostcode || "",
            is_default: true,
          });
        }
      }
    }

    // Auto-approve flow
    if (roaster.auto_approve_wholesale) {
      await supabase
        .from("wholesale_access")
        .update({
          status: "approved",
          price_tier: "standard",
          payment_terms: (roaster.auto_approve_payment_terms as string) || "net30",
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

      // Activate the contact record
      if (contactId) {
        const { data: contactForUpdate } = await supabase
          .from("contacts")
          .select("types")
          .eq("id", contactId)
          .single();

        const contactTypes = (contactForUpdate?.types as string[]) || [];
        const activateUpdates: Record<string, unknown> = { status: "active" };
        if (!contactTypes.includes("wholesale")) {
          activateUpdates.types = [...contactTypes, "wholesale"];
        }
        await supabase.from("contacts").update(activateUpdates).eq("id", contactId);
      }

      // Send approval email + account setup for new users
      try {
        const slug = roaster.storefront_slug || "";
        const wholesaleUrl = getStorefrontUrl(slug, "/wholesale/login");
        const catalogueUrl = getStorefrontUrl(slug, "/wholesale");

        const branding: EmailBranding = {
          logoUrl: roaster.brand_logo_url,
          logoSize: roaster.storefront_logo_size || "medium",
          buttonColour: roaster.storefront_button_colour || undefined,
          buttonTextColour: roaster.storefront_button_text_colour || undefined,
          buttonStyle: (roaster.storefront_button_style as "sharp" | "rounded" | "pill") || "rounded",
          primaryColour: roaster.brand_primary_colour || undefined,
          accentColour: roaster.brand_accent_colour || undefined,
          headingFont: roaster.brand_heading_font || undefined,
          bodyFont: roaster.brand_body_font || undefined,
          businessName: roaster.business_name,
          tagline: roaster.brand_tagline || undefined,
        };

        if (isNewUser && userId) {
          const token = crypto.randomBytes(32).toString("hex");
          const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

          await supabase.from("account_setup_tokens").insert({
            user_id: userId,
            token,
            expires_at: expiresAt,
            roaster_slug: roaster.storefront_slug || null,
          });

          const setupUrl = getStorefrontUrl(slug, `/setup-password?token=${token}`);

          const approvedTerms = (roaster.auto_approve_payment_terms as string) || "net30";
          await Promise.all([
            sendWholesaleApproved(email, name, roaster.business_name, "standard", approvedTerms, catalogueUrl, branding),
            sendWholesaleAccountSetup(email, name, roaster.business_name, setupUrl, wholesaleUrl, branding),
          ]);
        } else {
          const approvedTerms = (roaster.auto_approve_payment_terms as string) || "net30";
          await sendWholesaleApproved(
            email,
            name,
            roaster.business_name,
            "standard",
            approvedTerms,
            catalogueUrl,
            branding
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

      // Dispatch buyer.approved webhook
      dispatchWebhook(roasterId, "buyer.approved", {
        buyer: {
          user_id: userId,
          name,
          email,
          business_name: businessName,
          business_type: businessType || null,
          business_address: businessAddressText,
          business_website: businessWebsite || null,
          payment_terms: (roaster.auto_approve_payment_terms as string) || "net30",
          price_tier: "standard",
          status: "approved",
          approved_at: new Date().toISOString(),
        },
      });

      // Sync contact to Xero
      syncToXero(roasterId, async () => {
        await pushContactToXero(
          roasterId,
          {
            first_name: firstName,
            last_name: lastName,
            email,
            phone: phone || null,
            business_name: businessName,
          },
          {
            name: businessName,
            address_line_1: bizAddressLine1,
            address_line_2: bizAddressLine2,
            city: bizCity,
            postcode: bizPostcode,
          }
        );
      });

      // Sync contact to Sage
      syncToSage(roasterId, async () => {
        await pushContactToSage(
          roasterId,
          {
            first_name: firstName,
            last_name: lastName,
            email,
            phone: phone || null,
            business_name: businessName,
          },
          {
            name: businessName,
            address_line_1: bizAddressLine1,
            address_line_2: bizAddressLine2,
            city: bizCity,
            postcode: bizPostcode,
          }
        );
      });

      syncToQuickBooks(roasterId, async () => {
        await pushContactToQuickBooks(
          roasterId,
          {
            first_name: firstName,
            last_name: lastName,
            email,
            phone: phone || null,
            business_name: businessName,
          },
          {
            name: businessName,
            address_line_1: bizAddressLine1,
            address_line_2: bizAddressLine2,
            city: bizCity,
            postcode: bizPostcode,
          }
        );
      });

      return NextResponse.json({ success: true, status: "approved" });
    }

    // Notify the roaster about the new application
    if (roaster.user_id) {
      await createNotification({
        userId: roaster.user_id,
        type: "wholesale_application",
        title: "New wholesale application",
        body: `${businessName} has applied for wholesale access.`,
        link: "/wholesale-portal/buyers",
        metadata: { business_name: businessName, applicant_email: email },
      });
    }

    // Standard flow: send notification emails
    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "";
    const stdSlug = roaster.storefront_slug || "";
    const wholesaleUrl = getStorefrontUrl(stdSlug, "/wholesale/login");

    const stdBranding: EmailBranding = {
      logoUrl: roaster.brand_logo_url,
      logoSize: roaster.storefront_logo_size || "medium",
      buttonColour: roaster.storefront_button_colour || undefined,
      buttonTextColour: roaster.storefront_button_text_colour || undefined,
      buttonStyle: (roaster.storefront_button_style as "sharp" | "rounded" | "pill") || "rounded",
      primaryColour: roaster.brand_primary_colour || undefined,
      accentColour: roaster.brand_accent_colour || undefined,
      headingFont: roaster.brand_heading_font || undefined,
      bodyFont: roaster.brand_body_font || undefined,
      businessName: roaster.business_name,
      tagline: roaster.brand_tagline || undefined,
    };

    try {
      // Always send the "application received" email to the buyer
      // For new users, also send account setup email so they can set their password
      if (isNewUser && userId) {
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours

        await supabase.from("account_setup_tokens").insert({
          user_id: userId,
          token,
          expires_at: expiresAt,
          roaster_slug: roaster.storefront_slug || null,
        });

        const setupUrl = getStorefrontUrl(stdSlug, `/setup-password?token=${token}`);

        await Promise.all([
          sendWholesaleApplicationReceived(email, name, roaster.business_name, stdBranding),
          sendWholesaleAccountSetup(email, name, roaster.business_name, setupUrl, wholesaleUrl, stdBranding),
          sendWholesaleApplicationNotification(
            roaster.email,
            roaster.business_name,
            businessName,
            portalUrl
          ),
        ]);
      } else {
        await Promise.all([
          sendWholesaleApplicationReceived(email, name, roaster.business_name, stdBranding),
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
