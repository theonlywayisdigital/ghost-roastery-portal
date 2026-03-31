import { createServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const normalizedEmail = email.toLowerCase().trim();

    // Always return success to prevent email enumeration
    const successResponse = NextResponse.json({ success: true });

    // Look up roaster
    const { data: roaster } = await supabase
      .from("roasters")
      .select("id, contact_name, email")
      .eq("email", normalizedEmail)
      .eq("is_active", true)
      .single();

    if (!roaster) {
      return successResponse;
    }

    // Rate limit: max 3 tokens per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("password_reset_tokens")
      .select("*", { count: "exact", head: true })
      .eq("roaster_id", roaster.id)
      .gte("created_at", oneHourAgo);

    if ((count || 0) >= 3) {
      return successResponse;
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    const { error: insertError } = await supabase
      .from("password_reset_tokens")
      .insert({
        roaster_id: roaster.id,
        token,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("Failed to create reset token:", insertError);
      return successResponse;
    }

    // Send email
    const resetUrl = `${process.env.NEXT_PUBLIC_PORTAL_URL}/reset-password?token=${token}`;

    await sendPasswordResetEmail(roaster.email, resetUrl, roaster.contact_name).catch(
      (err) => console.error("Failed to send reset email:", err)
    );

    return successResponse;
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
