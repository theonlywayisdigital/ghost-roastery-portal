import { NextRequest, NextResponse } from "next/server";
import { createAuthServerClient, createServerClient } from "@/lib/supabase";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServerClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from("buyer_addresses")
      .select("id, user_id, roaster_id")
      .eq("id", id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Unset all defaults for this user+roaster
    await supabase
      .from("buyer_addresses")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("roaster_id", existing.roaster_id);

    // Set this one as default
    const { data: address, error } = await supabase
      .from("buyer_addresses")
      .update({ is_default: true })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to set default address:", error);
      return NextResponse.json(
        { error: "Failed to set default address" },
        { status: 500 }
      );
    }

    return NextResponse.json({ address });
  } catch (error) {
    console.error("Set default address error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
