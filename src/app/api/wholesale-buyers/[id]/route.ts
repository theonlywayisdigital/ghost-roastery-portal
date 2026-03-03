import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import {
  sendWholesaleApproved,
  sendWholesaleRejected,
} from "@/lib/email";
import { createNotification } from "@/lib/notifications";

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
  const { action, priceTier, paymentTerms, creditLimit, reason } = body as {
    action: "approve" | "reject" | "suspend" | "reactivate" | "update";
    priceTier?: string;
    paymentTerms?: string;
    creditLimit?: number | null;
    reason?: string;
  };

  const supabase = createServerClient();

  // Verify the record belongs to this roaster
  const { data: record } = await supabase
    .from("wholesale_access")
    .select(
      `id, status, user_id, business_name,
       users!wholesale_access_user_id_fkey(full_name, email)`
    )
    .eq("id", id)
    .eq("roaster_id", user.roaster.id)
    .single();

  if (!record) {
    return NextResponse.json({ error: "Record not found." }, { status: 404 });
  }

  const usersRaw = record.users as unknown;
  const userInfo = Array.isArray(usersRaw) ? usersRaw[0] as { full_name: string | null; email: string } | undefined : usersRaw as { full_name: string | null; email: string } | null;
  const contactName = userInfo?.full_name || record.business_name;
  const contactEmail = userInfo?.email || "";

  switch (action) {
    case "approve": {
      const tier = priceTier || "standard";
      const terms = paymentTerms || "prepay";

      const { error: updateError } = await supabase
        .from("wholesale_access")
        .update({
          status: "approved",
          price_tier: tier,
          payment_terms: terms,
          credit_limit: creditLimit ?? null,
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

      // Send approval email
      if (contactEmail) {
        try {
          await sendWholesaleApproved(
            contactEmail,
            contactName,
            user.roaster.business_name,
            tier,
            terms
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
      if (priceTier) updates.price_tier = priceTier;
      if (paymentTerms) updates.payment_terms = paymentTerms;
      if (creditLimit !== undefined) updates.credit_limit = creditLimit;

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
