import { createServerClient } from "@/lib/supabase";
import { sendWelcomeEmail } from "@/lib/email";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Look up token
    const { data: tokenRow, error: tokenError } = await supabase
      .from("email_verification_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (tokenError || !tokenRow) {
      return NextResponse.json(
        { error: "Invalid or expired verification link" },
        { status: 400 }
      );
    }

    // Check if already used
    if (tokenRow.used_at) {
      return NextResponse.json(
        { error: "This verification link has already been used" },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This verification link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Confirm the user's email in Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      tokenRow.user_id,
      { email_confirm: true }
    );

    if (updateError) {
      console.error("Failed to confirm email:", updateError);
      return NextResponse.json(
        { error: "Failed to verify email" },
        { status: 500 }
      );
    }

    // Mark token as used
    await supabase
      .from("email_verification_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenRow.id);

    // Send welcome email (fire-and-forget)
    const { data: roaster } = await supabase
      .from("roasters")
      .select("email, contact_name, business_name")
      .eq("user_id", tokenRow.user_id)
      .single();

    if (roaster) {
      sendWelcomeEmail(roaster.email, roaster.contact_name, roaster.business_name).catch(
        (err) => console.error("Failed to send welcome email:", err)
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
