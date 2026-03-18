import { NextResponse } from "next/server";
import { createServerClient, createAuthServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    // Authenticate via cookie
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { newEmail } = body as { newEmail: string };

    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const normalizedEmail = newEmail.toLowerCase().trim();

    if (normalizedEmail === user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: "New email is the same as current email" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check if email is already in use
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .neq("id", user.id)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: "This email address is already in use" },
        { status: 400 }
      );
    }

    // Update email via admin API (triggers confirmation email from Supabase)
    const { error: authError } =
      await supabase.auth.admin.updateUserById(user.id, {
        email: normalizedEmail,
      });

    if (authError) {
      console.error("Email update error:", authError);
      return NextResponse.json(
        { error: authError.message || "Failed to update email" },
        { status: 500 }
      );
    }

    // Update public.users email
    await supabase
      .from("users")
      .update({ email: normalizedEmail, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Buyer email change error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
