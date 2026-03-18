import { NextRequest, NextResponse } from "next/server";
import { createAuthServerClient, createServerClient } from "@/lib/supabase";

export async function PATCH(
  request: NextRequest,
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

    const body = await request.json();
    const {
      label,
      address_line_1,
      address_line_2,
      city,
      county,
      postcode,
      country,
    } = body as {
      label?: string;
      address_line_1?: string;
      address_line_2?: string;
      city?: string;
      county?: string;
      postcode?: string;
      country?: string;
    };

    const updates: Record<string, unknown> = {};
    if (label !== undefined) updates.label = label || null;
    if (address_line_1 !== undefined) updates.address_line_1 = address_line_1;
    if (address_line_2 !== undefined) updates.address_line_2 = address_line_2 || null;
    if (city !== undefined) updates.city = city;
    if (county !== undefined) updates.county = county || null;
    if (postcode !== undefined) updates.postcode = postcode;
    if (country !== undefined) updates.country = country;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { data: address, error } = await supabase
      .from("buyer_addresses")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update buyer address:", error);
      return NextResponse.json(
        { error: "Failed to update address" },
        { status: 500 }
      );
    }

    return NextResponse.json({ address });
  } catch (error) {
    console.error("Buyer address PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
      .select("id, user_id, roaster_id, is_default")
      .eq("id", id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("buyer_addresses")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Failed to delete buyer address:", error);
      return NextResponse.json(
        { error: "Failed to delete address" },
        { status: 500 }
      );
    }

    // If deleted address was default, promote another one
    if (existing.is_default) {
      const { data: remaining } = await supabase
        .from("buyer_addresses")
        .select("id")
        .eq("user_id", user.id)
        .eq("roaster_id", existing.roaster_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (remaining) {
        await supabase
          .from("buyer_addresses")
          .update({ is_default: true })
          .eq("id", remaining.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Buyer address DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
