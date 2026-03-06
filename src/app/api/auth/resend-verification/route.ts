import { createServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { sendEmailConfirmation } from "@/lib/email";
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

    // Look up user by email
    const { data: userData } = await supabase.auth.admin.listUsers();
    const user = userData?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    if (!user) {
      // Don't reveal whether the email exists
      return NextResponse.json({ success: true });
    }

    // If already confirmed, no need to resend
    if (user.email_confirmed_at) {
      return NextResponse.json({ success: true });
    }

    // Rate limit: max 3 tokens per user per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("email_verification_tokens")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneHourAgo);

    if ((count || 0) >= 3) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Get contact name from partner_roasters
    const { data: roaster } = await supabase
      .from("partner_roasters")
      .select("contact_name")
      .eq("user_id", user.id)
      .single();

    const contactName = roaster?.contact_name || user.user_metadata?.full_name || "there";

    // Generate new token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    await supabase.from("email_verification_tokens").insert({
      user_id: user.id,
      token,
      expires_at: expiresAt,
    });

    // Send confirmation email
    const confirmUrl = `${process.env.NEXT_PUBLIC_PORTAL_URL}/verify-email?token=${token}`;
    await sendEmailConfirmation(normalizedEmail, contactName, confirmUrl);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
