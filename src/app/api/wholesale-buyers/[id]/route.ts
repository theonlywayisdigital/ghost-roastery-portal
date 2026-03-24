import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import {
  sendWholesaleApproved,
  sendWholesaleRejected,
  type EmailBranding,
} from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { dispatchWebhook } from "@/lib/webhooks";
import { syncToXero, pushContactToXero } from "@/lib/xero";
import { syncToSage, pushContactToSage } from "@/lib/sage";
import { syncToQuickBooks, pushContactToQuickBooks } from "@/lib/quickbooks";
import { splitName } from "@/lib/people";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !user.roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action, paymentTerms, reason } = body as {
    action: "approve" | "reject" | "suspend" | "reactivate" | "update";
    paymentTerms?: string;
    reason?: string;
  };

  const supabase = createServerClient();

  const roasterId = user.roaster.id as string;

  // Verify the record belongs to this roaster
  const { data: record } = await supabase
    .from("wholesale_access")
    .select(
      `id, status, user_id, business_name, business_type, business_address,
       business_website, vat_number, business_id,
       users!wholesale_access_user_id_fkey(full_name, email)`
    )
    .eq("id", id)
    .eq("roaster_id", roasterId)
    .single();

  if (!record) {
    return NextResponse.json({ error: "Record not found." }, { status: 404 });
  }

  const usersRaw = record.users as unknown;
  const userInfo = Array.isArray(usersRaw) ? usersRaw[0] as { full_name: string | null; email: string } | undefined : usersRaw as { full_name: string | null; email: string } | null;
  const contactName = userInfo?.full_name || record.business_name;
  const contactEmail = userInfo?.email || "";
  const { firstName: contactFirstName, lastName: contactLastName } = splitName(contactName);

  switch (action) {
    case "approve": {
      const terms = paymentTerms || "prepay";

      const { error: updateError } = await supabase
        .from("wholesale_access")
        .update({
          status: "approved",
          payment_terms: terms,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejected_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to approve." },
          { status: 500 }
        );
      }

      // Grant wholesale_buyer role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", record.user_id)
        .eq("role_id", "wholesale_buyer")
        .maybeSingle();

      if (!existingRole) {
        await supabase.from("user_roles").insert({
          user_id: record.user_id,
          role_id: "wholesale_buyer",
        });
      }

      // Ensure business record exists
      let businessId = record.business_id as string | null;
      if (!businessId && record.business_name) {
        const { data: existingBiz } = await supabase
          .from("businesses")
          .select("id")
          .eq("roaster_id", roasterId)
          .ilike("name", record.business_name)
          .maybeSingle();

        if (existingBiz) {
          businessId = existingBiz.id;
        } else {
          const { data: newBiz } = await supabase
            .from("businesses")
            .insert({
              name: record.business_name,
              types: ["wholesale"],
              industry: record.business_type || null,
              address_line_1: record.business_address || null,
              website: record.business_website || null,
              source: "wholesale_application",
              roaster_id: roasterId,
            })
            .select("id")
            .single();

          if (newBiz) businessId = newBiz.id;
        }

        // Link business_id back to wholesale_access
        if (businessId) {
          await supabase
            .from("wholesale_access")
            .update({ business_id: businessId })
            .eq("id", id);
        }
      }

      // Ensure contact record exists and is active with wholesale type
      const { data: existingContact } = await supabase
        .from("contacts")
        .select("id, types, business_id, user_id, status")
        .eq("roaster_id", roasterId)
        .or(`user_id.eq.${record.user_id}${contactEmail ? `,email.eq.${contactEmail}` : ""}`)
        .maybeSingle();

      if (existingContact) {
        const currentTypes = (existingContact.types as string[]) || [];
        const contactUpdates: Record<string, unknown> = { status: "active" };
        if (!currentTypes.includes("wholesale")) {
          contactUpdates.types = [...currentTypes, "wholesale"];
        }
        if (!existingContact.business_id && businessId) {
          contactUpdates.business_id = businessId;
        }
        if (!existingContact.user_id) {
          contactUpdates.user_id = record.user_id;
        }
        await supabase.from("contacts").update(contactUpdates).eq("id", existingContact.id);
      } else if (contactEmail) {
        const { data: newContact } = await supabase.from("contacts").insert({
          first_name: contactFirstName,
          last_name: contactLastName,
          email: contactEmail.toLowerCase(),
          types: ["wholesale"],
          source: "wholesale_application",
          status: "active",
          business_id: businessId,
          business_name: record.business_name,
          user_id: record.user_id,
          roaster_id: roasterId,
        }).select().single();

        if (newContact) {
          dispatchWebhook(roasterId, "contact.created", {
            contact: newContact,
          });
        }
      }

      // Send approval email
      if (contactEmail) {
        try {
          const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "";
          const { data: roasterData } = await supabase
            .from("partner_roasters")
            .select("storefront_slug, brand_logo_url, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, brand_tagline")
            .eq("id", roasterId)
            .single();

          const catalogueUrl = roasterData?.storefront_slug
            ? `${portalUrl}/s/${roasterData.storefront_slug}/wholesale`
            : `${portalUrl}/wholesale`;

          const branding: EmailBranding | undefined = roasterData
            ? {
                logoUrl: roasterData.brand_logo_url,
                primaryColour: roasterData.brand_primary_colour || undefined,
                accentColour: roasterData.brand_accent_colour || undefined,
                headingFont: roasterData.brand_heading_font || undefined,
                bodyFont: roasterData.brand_body_font || undefined,
                businessName: user.roaster.business_name,
                tagline: roasterData.brand_tagline || undefined,
              }
            : undefined;

          await sendWholesaleApproved(
            contactEmail,
            contactName,
            user.roaster.business_name,
            "standard",
            terms,
            catalogueUrl,
            branding
          );
        } catch (e) {
          console.error("Failed to send approval email:", e);
        }
      }

      // Notify the applicant
      if (record.user_id) {
        await createNotification({
          userId: record.user_id,
          type: "wholesale_application",
          title: "Wholesale application approved",
          body: `Your wholesale application with ${user.roaster.business_name} has been approved.`,
          link: "/wholesale",
        });
      }

      // Dispatch buyer.approved webhook
      dispatchWebhook(roasterId, "buyer.approved", {
        buyer: {
          id: record.id,
          user_id: record.user_id,
          name: contactName,
          email: contactEmail,
          business_name: record.business_name,
          business_type: record.business_type,
          business_address: record.business_address,
          business_website: record.business_website,
          vat_number: record.vat_number,
          payment_terms: terms,
          status: "approved",
          approved_at: new Date().toISOString(),
        },
      });

      // Sync contact to Xero
      syncToXero(roasterId, async () => {
        await pushContactToXero(
          roasterId,
          {
            first_name: contactFirstName,
            last_name: contactLastName,
            email: contactEmail || null,
            business_name: record.business_name,
          },
          {
            name: record.business_name,
            vat_number: record.vat_number || null,
            address_line_1: record.business_address || null,
          }
        );
      });

      // Sync contact to Sage
      syncToSage(roasterId, async () => {
        await pushContactToSage(
          roasterId,
          {
            first_name: contactFirstName,
            last_name: contactLastName,
            email: contactEmail || null,
            business_name: record.business_name,
          },
          {
            name: record.business_name,
            vat_number: record.vat_number || null,
            address_line_1: record.business_address || null,
          }
        );
      });

      syncToQuickBooks(roasterId, async () => {
        await pushContactToQuickBooks(
          roasterId,
          {
            first_name: contactFirstName,
            last_name: contactLastName,
            email: contactEmail || null,
            business_name: record.business_name,
          },
          {
            name: record.business_name,
            vat_number: record.vat_number || null,
            address_line_1: record.business_address || null,
          }
        );
      });

      return NextResponse.json({ success: true });
    }

    case "reject": {
      const { error: updateError } = await supabase
        .from("wholesale_access")
        .update({
          status: "rejected",
          rejected_reason: reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to reject." },
          { status: 500 }
        );
      }

      if (contactEmail) {
        try {
          await sendWholesaleRejected(
            contactEmail,
            contactName,
            user.roaster.business_name,
            reason || ""
          );
        } catch (e) {
          console.error("Failed to send rejection email:", e);
        }
      }

      // Notify the applicant
      if (record.user_id) {
        await createNotification({
          userId: record.user_id,
          type: "wholesale_application",
          title: "Wholesale application update",
          body: `Your wholesale application with ${user.roaster.business_name} was not approved.${reason ? ` Reason: ${reason}` : ""}`,
          link: "/wholesale",
        });
      }

      return NextResponse.json({ success: true });
    }

    case "suspend": {
      const { error: updateError } = await supabase
        .from("wholesale_access")
        .update({
          status: "suspended",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to suspend." },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    case "reactivate": {
      const { error: updateError } = await supabase
        .from("wholesale_access")
        .update({
          status: "approved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to reactivate." },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    case "update": {
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (paymentTerms) updates.payment_terms = paymentTerms;

      const { error: updateError } = await supabase
        .from("wholesale_access")
        .update(updates)
        .eq("id", id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update." },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json(
        { error: "Invalid action." },
        { status: 400 }
      );
  }
}
