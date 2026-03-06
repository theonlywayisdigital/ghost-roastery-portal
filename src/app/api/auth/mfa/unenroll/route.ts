import { createAuthServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { factorId } = await request.json();

    if (!factorId) {
      return NextResponse.json(
        { error: "Factor ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createAuthServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { error } = await supabase.auth.mfa.unenroll({ factorId });

    if (error) {
      console.error("MFA unenroll error:", error);
      return NextResponse.json(
        { error: "Failed to disable 2FA" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("MFA unenroll error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
