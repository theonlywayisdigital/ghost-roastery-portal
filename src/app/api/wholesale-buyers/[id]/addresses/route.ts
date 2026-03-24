import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !user.roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();
  const roasterId = user.roaster.id as string;

  // Verify wholesale_access belongs to this roaster
  const { data: access } = await supabase
    .from("wholesale_access")
    .select("id, user_id")
    .eq("id", id)
    .eq("roaster_id", roasterId)
    .single();

  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: addresses, error } = await supabase
    .from("buyer_addresses")
    .select("*")
    .eq("wholesale_access_id", id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch buyer addresses:", error);
    return NextResponse.json(
      { error: "Failed to fetch addresses" },
      { status: 500 }
    );
  }

  return NextResponse.json({ addresses: addresses || [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !user.roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();
  const roasterId = user.roaster.id as string;

  // Verify wholesale_access belongs to this roaster
  const { data: access } = await supabase
    .from("wholesale_access")
    .select("id, user_id")
    .eq("id", id)
    .eq("roaster_id", roasterId)
    .single();

  if (!access) {
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
    is_default,
  } = body as {
    label?: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    county?: string;
    postcode: string;
    country?: string;
    is_default?: boolean;
  };

  if (!address_line_1 || !city || !postcode) {
    return NextResponse.json(
      { error: "Address line 1, city, and postcode are required" },
      { status: 400 }
    );
  }

  // If setting as default, unset existing defaults
  if (is_default) {
    await supabase
      .from("buyer_addresses")
      .update({ is_default: false })
      .eq("wholesale_access_id", id);
  }

  // Check if first address
  const { count } = await supabase
    .from("buyer_addresses")
    .select("id", { count: "exact", head: true })
    .eq("wholesale_access_id", id);

  const shouldBeDefault = is_default || count === 0;

  const { data: address, error } = await supabase
    .from("buyer_addresses")
    .insert({
      roaster_id: roasterId,
      user_id: access.user_id,
      wholesale_access_id: id,
      label: label || null,
      address_line_1,
      address_line_2: address_line_2 || null,
      city,
      county: county || null,
      postcode,
      country: country || "GB",
      is_default: shouldBeDefault,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create buyer address:", error);
    return NextResponse.json(
      { error: "Failed to create address" },
      { status: 500 }
    );
  }

  return NextResponse.json({ address });
}
