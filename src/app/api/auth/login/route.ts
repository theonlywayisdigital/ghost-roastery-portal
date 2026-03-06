import { createServerClient } from "@supabase/ssr";
import { createServerClient as createServiceClient } from "@/lib/supabase";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const normalizedEmail = email.toLowerCase().trim();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if email is confirmed
    if (!data.user.email_confirmed_at) {
      // Sign out the unconfirmed user
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          error: "Please verify your email before signing in.",
          requiresVerification: true,
          email: normalizedEmail,
        },
        { status: 403 }
      );
    }

    // Check for MFA factors
    const serviceClient = createServiceClient();
    const { data: factors } = await serviceClient.auth.admin.mfa.listFactors({
      userId: data.user.id,
    });

    const verifiedFactors = factors?.factors?.filter(
      (f) => f.factor_type === "totp" && f.status === "verified"
    ) || [];

    if (verifiedFactors.length > 0) {
      return NextResponse.json({
        success: true,
        requiresMfa: true,
        factorId: verifiedFactors[0].id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
