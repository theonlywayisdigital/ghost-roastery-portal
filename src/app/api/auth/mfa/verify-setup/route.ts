import { createAuthServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { factorId, code } = await request.json();

    if (!factorId || !code) {
      return NextResponse.json(
        { error: "Factor ID and verification code are required" },
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

    // Challenge and verify in one step to complete enrollment
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeError) {
      console.error("MFA challenge error:", challengeError);
      return NextResponse.json(
        { error: "Failed to verify 2FA setup" },
        { status: 500 }
      );
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (verifyError) {
      return NextResponse.json(
        { error: "Invalid verification code. Please try again." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("MFA verify-setup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
