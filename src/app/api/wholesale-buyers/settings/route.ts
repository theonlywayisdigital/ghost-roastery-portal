import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || !user.roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { autoApproveWholesale } = body as {
    autoApproveWholesale: boolean;
  };

  if (typeof autoApproveWholesale !== "boolean") {
    return NextResponse.json(
      { error: "Invalid value." },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { error } = await supabase
    .from("partner_roasters")
    .update({ auto_approve_wholesale: autoApproveWholesale })
    .eq("id", user.roaster.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update settings." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
