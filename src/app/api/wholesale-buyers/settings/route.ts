import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || !user.roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { autoApproveWholesale, wholesaleStripeEnabled, autoApprovePaymentTerms } = body as {
    autoApproveWholesale?: boolean;
    wholesaleStripeEnabled?: boolean;
    autoApprovePaymentTerms?: string;
  };

  const update: Record<string, boolean | string> = {};
  if (typeof autoApproveWholesale === "boolean") {
    update.auto_approve_wholesale = autoApproveWholesale;
  }
  if (typeof wholesaleStripeEnabled === "boolean") {
    update.wholesale_stripe_enabled = wholesaleStripeEnabled;
  }
  if (autoApprovePaymentTerms && ["net7", "net14", "net30"].includes(autoApprovePaymentTerms)) {
    update.auto_approve_payment_terms = autoApprovePaymentTerms;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No valid fields provided." },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { error } = await supabase
    .from("roasters")
    .update(update)
    .eq("id", user.roaster.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update settings." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
