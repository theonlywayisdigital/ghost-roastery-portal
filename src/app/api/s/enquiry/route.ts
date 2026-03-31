import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roaster_id, name, email, phone, business_name, message } = body;

    if (!roaster_id || !name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verify the roaster exists and has storefront enabled
    const { data: roaster } = await supabase
      .from("roasters")
      .select("id")
      .eq("id", roaster_id)
      .eq("storefront_enabled", true)
      .single();

    if (!roaster) {
      return NextResponse.json(
        { error: "Storefront not found." },
        { status: 404 }
      );
    }

    const { error } = await supabase.from("roaster_enquiries").insert({
      roaster_id,
      name,
      email: email.toLowerCase(),
      phone: phone || null,
      business_name: business_name || null,
      message,
      enquiry_type: business_name ? "wholesale" : "general",
    });

    if (error) {
      console.error("Failed to save enquiry:", error);
      return NextResponse.json(
        { error: "Failed to submit enquiry. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}
