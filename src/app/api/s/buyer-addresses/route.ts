import { NextResponse } from "next/server";
import { createAuthServerClient, createServerClient } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roasterId = searchParams.get("roasterId");

    if (!roasterId) {
      return NextResponse.json(
        { error: "roasterId is required" },
        { status: 400 }
      );
    }

    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();

    const { data: addresses, error } = await supabase
      .from("buyer_addresses")
      .select("*")
      .eq("user_id", user.id)
      .eq("roaster_id", roasterId)
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
  } catch (error) {
    console.error("Buyer addresses GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      roasterId,
      label,
      address_line_1,
      address_line_2,
      city,
      county,
      postcode,
      country,
      is_default,
    } = body as {
      roasterId: string;
      label?: string;
      address_line_1: string;
      address_line_2?: string;
      city: string;
      county?: string;
      postcode: string;
      country?: string;
      is_default?: boolean;
    };

    if (!roasterId || !address_line_1 || !city || !postcode) {
      return NextResponse.json(
        { error: "Address line 1, city, and postcode are required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verify wholesale access
    const { data: access } = await supabase
      .from("wholesale_access")
      .select("id")
      .eq("user_id", user.id)
      .eq("roaster_id", roasterId)
      .single();

    if (!access) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If setting as default, unset existing defaults
    if (is_default) {
      await supabase
        .from("buyer_addresses")
        .update({ is_default: false })
        .eq("user_id", user.id)
        .eq("roaster_id", roasterId);
    }

    // Check if this is the first address (auto-set as default)
    const { count } = await supabase
      .from("buyer_addresses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("roaster_id", roasterId);

    const shouldBeDefault = is_default || count === 0;

    const { data: address, error } = await supabase
      .from("buyer_addresses")
      .insert({
        roaster_id: roasterId,
        user_id: user.id,
        wholesale_access_id: access.id,
        label: label || null,
        address_line_1,
        address_line_2: address_line_2 || null,
        city,
        county: county || null,
        postcode,
        country: country || "United Kingdom",
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
  } catch (error) {
    console.error("Buyer addresses POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
