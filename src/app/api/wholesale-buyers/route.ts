import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import {
  sendWholesaleAccountSetup,
  sendWholesaleWelcome,
  type EmailBranding,
} from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { findOrCreatePerson } from "@/lib/people";
import crypto from "crypto";
import { dispatchWebhook } from "@/lib/webhooks";
import { syncToXero, pushContactToXero } from "@/lib/xero";
import { syncToSage, pushContactToSage } from "@/lib/sage";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: records, error } = await supabase
    .from("wholesale_access")
    .select(
      `id, user_id, status, business_name, business_type, business_address,
       business_website, vat_number, monthly_volume, notes,
       payment_terms, rejected_reason, created_at, updated_at,
       approved_at, users!wholesale_access_user_id_fkey(full_name, email)`
    )
    .eq("roaster_id", user.roaster.id)
    .order("created_at", { ascending: false });

  // Look up contact IDs for each buyer
  const userIds = (records || []).map((r) => r.user_id);
  const { data: contacts } = userIds.length
    ? await supabase
        .from("contacts")
        .select("id, user_id")
        .eq("roaster_id", user.roaster.id)
        .in("user_id", userIds)
    : { data: [] };

  const contactMap = new Map(
    (contacts || []).map((c) => [c.user_id, c.id])
  );

  if (error) {
    console.error("Failed to fetch wholesale buyers:", error);
    return NextResponse.json(
      { error: "Failed to fetch wholesale buyers." },
      { status: 500 }
    );
  }

  const enriched = (records || []).map((r) => ({
    ...r,
    contact_id: contactMap.get(r.user_id) || null,
  }));

  return NextResponse.json({ buyers: enriched });
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.roaster) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
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
      paymentTerms,
    } = body as {
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
      paymentTerms?: string;
    };

    if (!name || !email || !businessName) {
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
    const roasterId = user.roaster.id as string;

    // Get roaster details for emails
    const { data: roaster } = await supabase
      .from("partner_roasters")
      .select("id, user_id, business_name, email, storefront_slug, brand_logo_url, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, brand_tagline")
      .eq("id", roasterId)
      .single();

    if (!roaster) {
      return NextResponse.json({ error: "Roaster not found." }, { status: 404 });
    }

    // Find or create user account
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
        return NextResponse.json(
          { error: "Failed to create user account." },
          { status: 500 }
        );
      }

      if (authData.user) {
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
        { error: "Failed to create user account." },
        { status: 500 }
      );
    }

    // Check for existing wholesale_access record
    const { data: existing } = await supabase
      .from("wholesale_access")
      .select("id, status")
      .eq("user_id", userId)
      .eq("roaster_id", roasterId)
      .maybeSingle();

    if (existing) {
      if (existing.status === "approved") {
        return NextResponse.json(
          { error: "This user already has an approved wholesale account." },
          { status: 400 }
        );
      }
      if (existing.status === "pending") {
        return NextResponse.json(
          { error: "This user already has a pending wholesale application." },
          { status: 400 }
        );
      }
    }

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
      const { data: newBiz, error: bizError } = await supabase
        .from("businesses")
        .insert({
          name: businessName,
          types: ["wholesale"],
          industry: businessType || null,
          address_line_1: businessAddress || null,
          website: businessWebsite || null,
          source: "wholesale_application",
          roaster_id: roasterId,
        })
        .select("id")
        .single();

      if (bizError) {
        console.error("Failed to create business:", bizError);
        return NextResponse.json(
          { error: "Failed to create business record." },
          { status: 500 }
        );
      }

      businessId = newBiz?.id || null;
    }

    // Find or create contact record
    const nameParts = name.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    let contactId: string | null = null;
    const { data: existingContact } = await supabase
      .from("contacts")
      .select("id, types, business_id, user_id")
      .eq("roaster_id", roasterId)
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existingContact) {
      contactId = existingContact.id;
      const currentTypes = (existingContact.types as string[]) || [];
      const contactUpdates: Record<string, unknown> = { status: "active" };
      if (!currentTypes.includes("wholesale")) {
        contactUpdates.types = [...currentTypes, "wholesale"];
      }
      if (!existingContact.business_id && businessId) {
        contactUpdates.business_id = businessId;
      }
      if (!existingContact.user_id && userId) {
        contactUpdates.user_id = userId;
      }
      await supabase.from("contacts").update(contactUpdates).eq("id", existingContact.id);
    } else {
      const { data: newContact, error: contactError } = await supabase
        .from("contacts")
        .insert({
          first_name: firstName,
          last_name: lastName,
          email: email.toLowerCase(),
          phone: phone || null,
          types: ["wholesale"],
          source: "manual",
          status: "active",
          business_id: businessId,
          business_name: businessName,
          user_id: userId,
          roaster_id: roasterId,
        })
        .select("id")
        .single();

      if (contactError) {
        console.error("Failed to create contact:", contactError);
      }
      contactId = newContact?.id || null;
    }

    // Create wholesale_access record (auto-approved)
    const terms = paymentTerms || "prepay";
    const now = new Date().toISOString();

    const { data: wholesaleAccess, error: waError } = await supabase
      .from("wholesale_access")
      .upsert(
        {
          ...(existing ? { id: existing.id } : {}),
          user_id: userId,
          roaster_id: roasterId,
          status: "approved",
          business_name: businessName,
          business_type: businessType || null,
          business_address: businessAddress || null,
          business_website: businessWebsite || null,
          vat_number: vatNumber || null,
          monthly_volume: monthlyVolume || null,
          notes: notes || null,
          payment_terms: terms,
          business_id: businessId,
          approved_by: user.id,
          approved_at: now,
          rejected_reason: null,
          updated_at: now,
        },
        { onConflict: "id" }
      )
      .select("id")
      .single();

    if (waError) {
      console.error("Failed to create wholesale_access:", waError);
      return NextResponse.json(
        { error: "Failed to create wholesale access record." },
        { status: 500 }
      );
    }

    // Seed a buyer_addresses record from the provided address
    if (businessAddress && wholesaleAccess) {
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
          wholesale_access_id: wholesaleAccess.id,
          label: "Business",
          address_line_1: businessAddress,
          city: "",
          postcode: "",
          is_default: true,
        });
      }
    }

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

    // Ensure people record exists
    findOrCreatePerson(supabase, email, firstName, lastName, phone).catch(() => {});

    // Send emails
    try {
      const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "";
      const wholesaleUrl = `${portalUrl}/s/${roaster.storefront_slug}/wholesale/login`;

      const branding: EmailBranding = {
        logoUrl: roaster.brand_logo_url,
        primaryColour: roaster.brand_primary_colour || undefined,
        accentColour: roaster.brand_accent_colour || undefined,
        headingFont: roaster.brand_heading_font || undefined,
        bodyFont: roaster.brand_body_font || undefined,
        businessName: roaster.business_name,
        tagline: roaster.brand_tagline || undefined,
      };

      if (isNewUser) {
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

        await supabase.from("account_setup_tokens").insert({
          user_id: userId,
          token,
          expires_at: expiresAt,
          roaster_slug: roaster.storefront_slug || null,
        });

        const setupUrl = `${portalUrl}/s/${roaster.storefront_slug}/setup-password?token=${token}`;

        await sendWholesaleAccountSetup(email, name, roaster.business_name, setupUrl, wholesaleUrl, branding);
      } else {
        await sendWholesaleWelcome(email, name, roaster.business_name, terms, wholesaleUrl, branding);
      }
    } catch (emailErr) {
      console.error("Failed to send emails:", emailErr);
    }

    // Notify the new wholesale customer
    await createNotification({
      userId,
      type: "wholesale_application",
      title: "Wholesale account created",
      body: `Your wholesale account with ${roaster.business_name} has been set up. You can now browse the wholesale catalogue.`,
      link: "/wholesale",
    });

    // Dispatch buyer.approved webhook
    dispatchWebhook(roasterId, "buyer.approved", {
      buyer: {
        id: wholesaleAccess?.id || null,
        user_id: userId,
        name,
        email,
        business_name: businessName,
        business_type: businessType || null,
        business_address: businessAddress || null,
        business_website: businessWebsite || null,
        vat_number: vatNumber || null,
        payment_terms: terms,
        status: "approved",
        approved_at: now,
      },
    });

    // Dispatch contact.created webhook if a new contact was created
    if (contactId) {
      dispatchWebhook(roasterId, "contact.created", {
        contact: {
          id: contactId,
          first_name: firstName,
          last_name: lastName,
          email: email.toLowerCase(),
          phone: phone || null,
          types: ["wholesale"],
          source: "manual",
          business_id: businessId,
          business_name: businessName,
          roaster_id: roasterId,
        },
      });
    }

    // Sync contact to Xero
    syncToXero(roasterId, async () => {
      await pushContactToXero(
        roasterId,
        {
          first_name: firstName,
          last_name: lastName,
          email: email.toLowerCase(),
          phone: phone || null,
          business_name: businessName,
        },
        {
          name: businessName,
          vat_number: vatNumber || null,
          address_line_1: businessAddress || null,
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
          email: email.toLowerCase(),
          phone: phone || null,
          business_name: businessName,
        },
        {
          name: businessName,
          vat_number: vatNumber || null,
          address_line_1: businessAddress || null,
        }
      );
    });

    return NextResponse.json({
      success: true,
      wholesaleAccess: wholesaleAccess || null,
      businessId: businessId || null,
      contactId: contactId || null,
    });
  } catch (error) {
    console.error("Add wholesale customer error:", error);
    return NextResponse.json(
      { error: "Failed to add wholesale customer." },
      { status: 500 }
    );
  }
}
