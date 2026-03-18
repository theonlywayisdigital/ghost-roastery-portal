import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; addressId: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !user.roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, addressId } = await params;
  const supabase = createServerClient();
  const roasterId = user.roaster.id as string;

  // Verify wholesale_access belongs to this roaster
  const { data: access } = await supabase
    .from("wholesale_access")
    .select("id")
    .eq("id", id)
    .eq("roaster_id", roasterId)
    .single();

  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Verify address belongs to this wholesale_access
  const { data: existing } = await supabase
    .from("buyer_addresses")
    .select("id, wholesale_access_id")
    .eq("id", addressId)
    .eq("wholesale_access_id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
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
    is_default,
  } = body as {
    label?: string;
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    county?: string;
    postcode?: string;
    country?: string;
    is_default?: boolean;
  };

  const updates: Record<string, unknown> = {};
  if (label !== undefined) updates.label = label || null;
  if (address_line_1 !== undefined) updates.address_line_1 = address_line_1;
  if (address_line_2 !== undefined) updates.address_line_2 = address_line_2 || null;
  if (city !== undefined) updates.city = city;
  if (county !== undefined) updates.county = county || null;
  if (postcode !== undefined) updates.postcode = postcode;
  if (country !== undefined) updates.country = country;

  // Handle default toggle
  if (is_default) {
    await supabase
      .from("buyer_addresses")
      .update({ is_default: false })
      .eq("wholesale_access_id", id);
    updates.is_default = true;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const { data: address, error } = await supabase
    .from("buyer_addresses")
    .update(updates)
    .eq("id", addressId)
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
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; addressId: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !user.roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, addressId } = await params;
  const supabase = createServerClient();
  const roasterId = user.roaster.id as string;

  // Verify wholesale_access belongs to this roaster
  const { data: access } = await supabase
    .from("wholesale_access")
    .select("id")
    .eq("id", id)
    .eq("roaster_id", roasterId)
    .single();

  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Verify address belongs to this wholesale_access
  const { data: existing } = await supabase
    .from("buyer_addresses")
    .select("id, wholesale_access_id, is_default")
    .eq("id", addressId)
    .eq("wholesale_access_id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("buyer_addresses")
    .delete()
    .eq("id", addressId);

  if (error) {
    console.error("Failed to delete buyer address:", error);
    return NextResponse.json(
      { error: "Failed to delete address" },
      { status: 500 }
    );
  }

  // If deleted was default, promote next one
  if (existing.is_default) {
    const { data: remaining } = await supabase
      .from("buyer_addresses")
      .select("id")
      .eq("wholesale_access_id", id)
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
}
