import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { findOrCreatePerson } from "@/lib/people";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email, first_name, last_name, role, associated_roaster_id } = body;

    if (!email || !first_name || !last_name || !role) {
      return NextResponse.json(
        { error: "email, first_name, last_name, and role are required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const normalizedEmail = email.toLowerCase();

    // Find or create person record
    const peopleId = await findOrCreatePerson(
      supabase,
      normalizedEmail,
      first_name,
      last_name
    );

    if (!peopleId) {
      return NextResponse.json(
        { error: "Failed to create person record" },
        { status: 500 }
      );
    }

    // Create auth user (email_confirm: false triggers invite email)
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: false,
        user_metadata: {
          full_name: `${first_name} ${last_name}`,
        },
      });

    if (authError || !authData.user) {
      console.error("Admin invite createUser error:", authError);
      return NextResponse.json(
        { error: authError?.message || "Failed to create auth user" },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // Trigger auto-creates public.users — upsert to ensure first_name/last_name
    await supabase.from("users").upsert({
      id: userId,
      email: normalizedEmail,
      first_name: first_name,
      last_name: last_name,
    }, { onConflict: "id" });

    // Create profiles row
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      people_id: peopleId,
      role,
      auth_status: "invited",
      associated_roaster_id: associated_roaster_id || null,
    });

    if (profileError) {
      console.error("Admin invite profile insert error:", profileError);
      // Attempt cleanup of auth user
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "Failed to create user profile" },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from("user_activity_log").insert({
      user_id: userId,
      performed_by: user.id,
      action: "user_invited",
      metadata: { email, role, associated_roaster_id },
    });

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    console.error("Admin invite error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
