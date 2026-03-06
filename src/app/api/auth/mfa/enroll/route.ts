import { createAuthServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createAuthServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator App",
    });

    if (error) {
      console.error("MFA enroll error:", error);
      return NextResponse.json(
        { error: "Failed to set up 2FA" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    });
  } catch (error) {
    console.error("MFA enroll error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
