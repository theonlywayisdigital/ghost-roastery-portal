import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters with one uppercase letter and one special character" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Find valid token
    const { data: setupToken } = await supabase
      .from("account_setup_tokens")
      .select("id, user_id, expires_at, used_at")
      .eq("token", token)
      .single();

    if (!setupToken) {
      return NextResponse.json(
        { error: "Invalid setup link" },
        { status: 400 }
      );
    }

    if (setupToken.used_at) {
      return NextResponse.json(
        { error: "This setup link has already been used" },
        { status: 400 }
      );
    }

    if (new Date(setupToken.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This setup link has expired" },
        { status: 400 }
      );
    }

    // Set the user's password in Supabase Auth
    const { error: authError } = await supabase.auth.admin.updateUserById(
      setupToken.user_id,
      { password }
    );

    if (authError) {
      console.error("Setup password auth error:", authError);
      return NextResponse.json(
        { error: "Failed to set password" },
        { status: 500 }
      );
    }

    // Mark token as used
    await supabase
      .from("account_setup_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", setupToken.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Setup password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
