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

    // Check if user is authenticated via cookies
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ authenticated: false });
    }

    // Fetch user profile
    const supabase = createServerClient();
    const { data: profile } = await supabase
      .from("users")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    // Check wholesale_access record for this roaster
    const { data: access } = await supabase
      .from("wholesale_access")
      .select("id, status, payment_terms")
      .eq("user_id", user.id)
      .eq("roaster_id", roasterId)
      .single();

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email || profile?.email || "",
        name: profile?.full_name || "",
      },
      access: access
        ? {
            id: access.id,
            status: access.status,
            paymentTerms: access.payment_terms,
          }
        : null,
    });
  } catch (error) {
    console.error("Wholesale access check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
