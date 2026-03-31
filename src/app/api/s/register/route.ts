import { createServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { splitName } from "@/lib/people";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, password, roasterId } = body;

    if (!email || !name || !password || !roasterId) {
      return NextResponse.json(
        { error: "Email, name, password, and roasterId are required" },
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
    const normalizedEmail = email.toLowerCase().trim();

    // Verify roaster exists and is active
    const { data: roaster } = await supabase
      .from("roasters")
      .select("id")
      .eq("id", roasterId)
      .eq("storefront_enabled", true)
      .single();

    if (!roaster) {
      return NextResponse.json(
        { error: "Invalid store" },
        { status: 400 }
      );
    }

    // --- Attempt to create a fresh auth user ---
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: name },
      });

    let userId: string;

    if (!authError) {
      // Fresh user created. The on_auth_user_created DB trigger
      // auto-creates the public.users row.
      userId = authData.user.id;
    } else if (authError.message?.includes("already been registered")) {
      // An auth.users entry already exists for this email.
      // Look up via public.users (mirrored by on_auth_user_created trigger)
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", normalizedEmail)
        .single();

      if (!existingUser) {
        return NextResponse.json(
          { error: "Failed to create account — user lookup failed" },
          { status: 500 }
        );
      }

      // Block if they have a real account role (roaster, admin, wholesale_buyer)
      const { data: existingRoles } = await supabase
        .from("user_roles")
        .select("role_id")
        .eq("user_id", existingUser.id);

      const roles = (existingRoles || []).map((r) => r.role_id);
      const hasProtectedRole = roles.some((r) =>
        ["roaster", "admin", "wholesale_buyer"].includes(r)
      );

      if (hasProtectedRole) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in instead." },
          { status: 409 }
        );
      }

      // Claim: set password + confirm email on the existing shell user
      const { error: updateError } =
        await supabase.auth.admin.updateUserById(existingUser.id, {
          password,
          email_confirm: true,
        });

      if (updateError) {
        console.error("Register claim error:", updateError);
        return NextResponse.json(
          { error: "Failed to create account — claim failed" },
          { status: 500 }
        );
      }

      userId = existingUser.id;

      // Ensure public.users row has their name (first_name/last_name; full_name is generated)
      const { firstName: regFirst, lastName: regLast } = splitName(name);
      await supabase
        .from("users")
        .update({ first_name: regFirst, last_name: regLast })
        .eq("id", userId);
    } else {
      // Unexpected error — return the actual message for debugging
      console.error("Register auth error:", authError.message, authError);
      return NextResponse.json(
        { error: `Account creation failed: ${authError.message}` },
        { status: 500 }
      );
    }

    // Grant retail_buyer role
    await supabase.from("user_roles").upsert(
      { user_id: userId, role_id: "retail_buyer" },
      { onConflict: "user_id,role_id,roaster_id" }
    );

    // Link any existing guest orders to the new user
    await supabase
      .from("orders")
      .update({ user_id: userId })
      .eq("customer_email", normalizedEmail)
      .is("user_id", null)
      .eq("roaster_id", roasterId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
