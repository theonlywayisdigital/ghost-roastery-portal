import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    business_name: roaster.business_name || "",
    business_type: roaster.business_type || "sole_trader",
    registration_number: roaster.registration_number || "",
    vat_registered: roaster.vat_registered ?? false,
    vat_number: roaster.vat_number || "",
    email: roaster.email || "",
    business_phone: roaster.business_phone || "",
    address_line_1: roaster.address_line_1 || "",
    address_line_2: roaster.address_line_2 || "",
    city: roaster.city || "",
    county: roaster.county || "",
    postcode: roaster.postcode || "",
    country: roaster.country || "GB",
    brand_logo_url: roaster.brand_logo_url || null,
  });
}

export async function PUT(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const allowedFields = [
      "business_name",
      "business_type",
      "registration_number",
      "vat_registered",
      "vat_number",
      "email",
      "business_phone",
      "address_line_1",
      "address_line_2",
      "city",
      "county",
      "postcode",
      "country",
      "brand_logo_url",
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase
      .from("roasters")
      .update(updates)
      .eq("id", roaster.id);

    if (error) {
      console.error("Business settings update error:", error);
      return NextResponse.json(
        { error: "Failed to update business settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Business settings update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
