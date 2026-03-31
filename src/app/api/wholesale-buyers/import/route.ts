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
import { syncToQuickBooks, pushContactToQuickBooks } from "@/lib/quickbooks";
import {
  csvToNormalisedWholesaleBuyers,
  type WholesaleField,
  type WholesaleImportResult,
} from "@/lib/wholesale-import";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { csvText, mapping } = body as {
    csvText: string;
    mapping: Record<string, WholesaleField>;
  };

  if (!csvText || !mapping) {
    return NextResponse.json(
      { error: "csvText and mapping are required" },
      { status: 400 }
    );
  }

  const roasterId = user.roaster.id as string;
  const supabase = createServerClient();

  // Parse CSV
  const { buyers, errors: parseErrors, totalRows } = csvToNormalisedWholesaleBuyers({
    csvText,
    mapping,
  });

  const parseSkipped = totalRows - buyers.length;

  if (buyers.length === 0) {
    return NextResponse.json({
      imported: 0,
      skipped: parseSkipped,
      errors: parseErrors.length > 0 ? parseErrors : ["No buyers found in CSV"],
      total: totalRows,
      emailsFailed: 0,
    } satisfies WholesaleImportResult);
  }

  // Get roaster details for emails
  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select(
      "id, user_id, business_name, email, storefront_slug, brand_logo_url, storefront_logo_size, storefront_button_colour, storefront_button_text_colour, storefront_button_style, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, brand_tagline"
    )
    .eq("id", roasterId)
    .single();

  if (!roaster) {
    return NextResponse.json({ error: "Roaster not found." }, { status: 404 });
  }

  const branding: EmailBranding = {
    logoUrl: roaster.brand_logo_url,
    logoSize: roaster.storefront_logo_size || "medium",
    buttonColour: roaster.storefront_button_colour || undefined,
    buttonTextColour: roaster.storefront_button_text_colour || undefined,
    buttonStyle:
      (roaster.storefront_button_style as "sharp" | "rounded" | "pill") ||
      "rounded",
    primaryColour: roaster.brand_primary_colour || undefined,
    accentColour: roaster.brand_accent_colour || undefined,
    headingFont: roaster.brand_heading_font || undefined,
    bodyFont: roaster.brand_body_font || undefined,
    businessName: roaster.business_name,
    tagline: roaster.brand_tagline || undefined,
  };

  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "";
  const wholesaleUrl = `${portalUrl}/s/${roaster.storefront_slug}/wholesale/login`;

  // Get existing wholesale emails for dedup
  const { data: existingAccess } = await supabase
    .from("wholesale_access")
    .select("user_id, status, users!wholesale_access_user_id_fkey(email)")
    .eq("roaster_id", roasterId)
    .in("status", ["approved", "pending"]);

  const existingEmails = new Set(
    (existingAccess || []).map((a) => {
      const u = Array.isArray(a.users) ? a.users[0] : a.users;
      return u?.email?.toLowerCase() || "";
    }).filter(Boolean)
  );

  let imported = 0;
  let skipped = 0;
  let emailsFailed = 0;
  const errors = [...parseErrors];

  // Track emails within this batch to detect in-batch duplicates
  const batchEmails = new Set<string>();

  for (let i = 0; i < buyers.length; i++) {
    const buyer = buyers[i];

    try {
      // Email dedup
      if (existingEmails.has(buyer.email) || batchEmails.has(buyer.email)) {
        errors.push(
          `Row ${i + 2}: "${buyer.email}" already has wholesale access — skipped`
        );
        skipped++;
        continue;
      }
      batchEmails.add(buyer.email);

      const fullName = [buyer.first_name, buyer.last_name]
        .filter(Boolean)
        .join(" ");

      // 1. Find or create user account
      let userId: string | null = null;
      let isNewUser = false;

      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", buyer.email)
        .single();

      if (existingUser) {
        userId = existingUser.id;
      } else {
        isNewUser = true;
        const { data: authData, error: authError } =
          await supabase.auth.admin.createUser({
            email: buyer.email,
            email_confirm: true,
            user_metadata: { full_name: fullName },
          });

        if (authError) {
          console.error(
            `[wholesale-import] Failed to create user for ${buyer.email}:`,
            authError
          );
          errors.push(`${buyer.email}: Failed to create user account`);
          skipped++;
          continue;
        }

        if (authData.user) {
          userId = authData.user.id;
          await supabase
            .from("users")
            .upsert(
              {
                id: userId,
                email: buyer.email,
                first_name: buyer.first_name,
                last_name: buyer.last_name || "",
              },
              { onConflict: "id" }
            );
        }
      }

      if (!userId) {
        errors.push(`${buyer.email}: Failed to create user account`);
        skipped++;
        continue;
      }

      // 2. Check for existing wholesale_access (shouldn't happen due to dedup above, but safety check)
      const { data: existing } = await supabase
        .from("wholesale_access")
        .select("id, status")
        .eq("user_id", userId)
        .eq("roaster_id", roasterId)
        .maybeSingle();

      if (existing && (existing.status === "approved" || existing.status === "pending")) {
        errors.push(
          `Row ${i + 2}: "${buyer.email}" already has wholesale access — skipped`
        );
        skipped++;
        continue;
      }

      // 3. Find or create business record
      let businessId: string | null = null;
      const { data: existingBiz } = await supabase
        .from("businesses")
        .select("id")
        .eq("roaster_id", roasterId)
        .ilike("name", buyer.business_name)
        .maybeSingle();

      if (existingBiz) {
        businessId = existingBiz.id;
      } else {
        const { data: newBiz, error: bizError } = await supabase
          .from("businesses")
          .insert({
            name: buyer.business_name,
            types: ["wholesale"],
            industry: buyer.business_type || null,
            address_line_1: buyer.business_address || null,
            website: buyer.business_website || null,
            source: "wholesale_application",
            roaster_id: roasterId,
          })
          .select("id")
          .single();

        if (bizError) {
          console.error(
            `[wholesale-import] Failed to create business for ${buyer.email}:`,
            bizError
          );
        }
        businessId = newBiz?.id || null;
      }

      // 4. Find or create contact record
      let contactId: string | null = null;
      const { data: existingContact } = await supabase
        .from("contacts")
        .select("id, types, business_id, user_id")
        .eq("roaster_id", roasterId)
        .eq("email", buyer.email)
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
        await supabase
          .from("contacts")
          .update(contactUpdates)
          .eq("id", existingContact.id);
      } else {
        const { data: newContact, error: contactError } = await supabase
          .from("contacts")
          .insert({
            first_name: buyer.first_name,
            last_name: buyer.last_name,
            email: buyer.email,
            phone: buyer.phone || null,
            types: ["wholesale"],
            source: "import",
            status: "active",
            business_id: businessId,
            business_name: buyer.business_name,
            user_id: userId,
            roaster_id: roasterId,
          })
          .select("id")
          .single();

        if (contactError) {
          console.error(
            `[wholesale-import] Failed to create contact for ${buyer.email}:`,
            contactError
          );
        }
        contactId = newContact?.id || null;
      }

      // 5. Create wholesale_access record (auto-approved)
      const terms = buyer.payment_terms || "prepay";
      const now = new Date().toISOString();

      const { data: wholesaleAccess, error: waError } = await supabase
        .from("wholesale_access")
        .upsert(
          {
            ...(existing ? { id: existing.id } : {}),
            user_id: userId,
            roaster_id: roasterId,
            status: "approved",
            business_name: buyer.business_name,
            business_type: buyer.business_type || null,
            business_address: buyer.business_address || null,
            business_website: buyer.business_website || null,
            vat_number: buyer.vat_number || null,
            monthly_volume: buyer.monthly_volume || null,
            notes: buyer.notes || null,
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
        console.error(
          `[wholesale-import] Failed to create wholesale_access for ${buyer.email}:`,
          waError
        );
        errors.push(`${buyer.email}: Failed to create wholesale access`);
        skipped++;
        continue;
      }

      // 6. Seed buyer_addresses if address provided
      if (buyer.business_address && wholesaleAccess) {
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
            address_line_1: buyer.business_address,
            city: "",
            postcode: "",
            is_default: true,
          });
        }
      }

      // 7. Grant wholesale_buyer role
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

      // 8. Ensure people record exists (fire-and-forget)
      findOrCreatePerson(
        supabase,
        buyer.email,
        buyer.first_name,
        buyer.last_name,
        buyer.phone
      ).catch(() => {});

      // 9. Send invite email
      try {
        if (isNewUser) {
          const token = crypto.randomBytes(32).toString("hex");
          const expiresAt = new Date(
            Date.now() + 48 * 60 * 60 * 1000
          ).toISOString();

          await supabase.from("account_setup_tokens").insert({
            user_id: userId,
            token,
            expires_at: expiresAt,
            roaster_slug: roaster.storefront_slug || null,
          });

          const setupUrl = `${portalUrl}/s/${roaster.storefront_slug}/setup-password?token=${token}`;

          await sendWholesaleAccountSetup(
            buyer.email,
            fullName,
            roaster.business_name,
            setupUrl,
            wholesaleUrl,
            branding
          );
        } else {
          await sendWholesaleWelcome(
            buyer.email,
            fullName,
            roaster.business_name,
            terms,
            wholesaleUrl,
            branding
          );
        }
      } catch (emailErr) {
        console.error(
          `[wholesale-import] Failed to send email to ${buyer.email}:`,
          emailErr
        );
        emailsFailed++;
      }

      // 10. Create notification
      createNotification({
        userId,
        type: "wholesale_application",
        title: "Wholesale account created",
        body: `Your wholesale account with ${roaster.business_name} has been set up. You can now browse the wholesale catalogue.`,
        link: "/wholesale",
      }).catch(() => {});

      // 11. Dispatch webhooks (fire-and-forget)
      dispatchWebhook(roasterId, "buyer.approved", {
        buyer: {
          id: wholesaleAccess?.id || null,
          user_id: userId,
          name: fullName,
          email: buyer.email,
          business_name: buyer.business_name,
          business_type: buyer.business_type || null,
          business_address: buyer.business_address || null,
          business_website: buyer.business_website || null,
          vat_number: buyer.vat_number || null,
          payment_terms: terms,
          status: "approved",
          approved_at: now,
        },
      });

      if (contactId) {
        dispatchWebhook(roasterId, "contact.created", {
          contact: {
            id: contactId,
            first_name: buyer.first_name,
            last_name: buyer.last_name,
            email: buyer.email,
            phone: buyer.phone || null,
            types: ["wholesale"],
            source: "import",
            business_id: businessId,
            business_name: buyer.business_name,
            roaster_id: roasterId,
          },
        });
      }

      // 12. Sync to accounting (fire-and-forget)
      syncToXero(roasterId, async () => {
        await pushContactToXero(
          roasterId,
          {
            first_name: buyer.first_name,
            last_name: buyer.last_name,
            email: buyer.email,
            phone: buyer.phone || null,
            business_name: buyer.business_name,
          },
          {
            name: buyer.business_name,
            vat_number: buyer.vat_number || null,
            address_line_1: buyer.business_address || null,
          }
        );
      });

      syncToSage(roasterId, async () => {
        await pushContactToSage(
          roasterId,
          {
            first_name: buyer.first_name,
            last_name: buyer.last_name,
            email: buyer.email,
            phone: buyer.phone || null,
            business_name: buyer.business_name,
          },
          {
            name: buyer.business_name,
            vat_number: buyer.vat_number || null,
            address_line_1: buyer.business_address || null,
          }
        );
      });

      syncToQuickBooks(roasterId, async () => {
        await pushContactToQuickBooks(
          roasterId,
          {
            first_name: buyer.first_name,
            last_name: buyer.last_name,
            email: buyer.email,
            phone: buyer.phone || null,
            business_name: buyer.business_name,
          },
          {
            name: buyer.business_name,
            vat_number: buyer.vat_number || null,
            address_line_1: buyer.business_address || null,
          }
        );
      });

      imported++;
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: string }).message)
            : "Unknown error";
      console.error(
        `[wholesale-import] Failed to import "${buyer.email}":`,
        err
      );
      errors.push(`${buyer.email}: ${errMsg}`);
      skipped++;
    }
  }

  const result: WholesaleImportResult = {
    imported,
    skipped: skipped + parseSkipped,
    errors,
    total: totalRows,
    emailsFailed,
  };

  return NextResponse.json(result);
}
