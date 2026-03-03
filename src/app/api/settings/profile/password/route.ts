import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAuthServerClient } from "@/lib/supabase";

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { new_password, confirm_password } = body;

    if (!new_password || new_password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (new_password !== confirm_password) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    const supabase = await createAuthServerClient();
    const { error } = await supabase.auth.updateUser({
      password: new_password,
    });

    if (error) {
      console.error("Password change error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to change password" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
