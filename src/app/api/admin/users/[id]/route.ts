import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Fetch auth user, people record, roaster, contacts, and roles in parallel
  const [authResult, peopleResult, roasterResult, contactsResult, rolesResult] =
    await Promise.all([
      supabase.auth.admin.getUserById(id),
      profile.people_id
        ? supabase
            .from("people")
            .select("*")
            .eq("id", profile.people_id)
            .single()
        : Promise.resolve({ data: null }),
      profile.associated_roaster_id
        ? supabase
            .from("roasters")
            .select("id, business_name")
            .eq("id", profile.associated_roaster_id)
            .single()
        : Promise.resolve({ data: null }),
      profile.people_id
        ? supabase
            .from("contacts")
            .select("*")
            .eq("people_id", profile.people_id)
        : Promise.resolve({ data: [] }),
      supabase.from("user_roles").select("*").eq("user_id", id),
    ]);

  const authUser = authResult.data?.user || null;
  const person = peopleResult.data;
  const associatedRoaster = roasterResult.data;
  const contacts = contactsResult.data || [];
  const roles = rolesResult.data || [];

  const fullName = person
    ? `${person.first_name || ""} ${person.last_name || ""}`.trim()
    : authUser?.user_metadata?.full_name || null;

  return NextResponse.json({
    user: {
      id,
      email: authUser?.email || null,
      full_name: fullName,
      phone: person?.phone || null,
      avatar_url: authUser?.user_metadata?.avatar_url || null,
      role: profile.role,
      auth_status: profile.auth_status,
      associated_roaster: associatedRoaster || null,
      people_id: profile.people_id,
      last_login_at:
        profile.last_login_at || authUser?.last_sign_in_at || null,
      created_at: authUser?.created_at || profile.created_at,
    },
    contacts,
    roles,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createServerClient();

    // Verify user exists
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, people_id")
      .eq("id", id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update profile fields
    const profileUpdates: Record<string, unknown> = {};
    const profileFields = ["role", "auth_status", "associated_roaster_id"];
    const changes: string[] = [];

    for (const field of profileFields) {
      if (field in body) {
        profileUpdates[field] = body[field];
        changes.push(field);
      }
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", id);

      if (error) {
        console.error("Admin user profile update error:", error);
        return NextResponse.json(
          { error: "Failed to update profile" },
          { status: 500 }
        );
      }
    }

    // Update people record if name/phone changed
    const peopleUpdates: Record<string, unknown> = {};
    if (body.first_name !== undefined) {
      peopleUpdates.first_name = body.first_name;
      changes.push("first_name");
    }
    if (body.last_name !== undefined) {
      peopleUpdates.last_name = body.last_name;
      changes.push("last_name");
    }
    if (body.phone !== undefined) {
      peopleUpdates.phone = body.phone;
      changes.push("phone");
    }

    if (Object.keys(peopleUpdates).length > 0 && profile.people_id) {
      const { error } = await supabase
        .from("people")
        .update(peopleUpdates)
        .eq("id", profile.people_id);

      if (error) {
        console.error("Admin user people update error:", error);
        return NextResponse.json(
          { error: "Failed to update person record" },
          { status: 500 }
        );
      }
    }

    // Also update users table (first_name/last_name; full_name is generated)
    const userUpdates: Record<string, unknown> = {};
    if (body.first_name !== undefined) userUpdates.first_name = body.first_name;
    if (body.last_name !== undefined) userUpdates.last_name = body.last_name;
    if (body.phone !== undefined) userUpdates.phone = body.phone;

    if (Object.keys(userUpdates).length > 0) {
      userUpdates.updated_at = new Date().toISOString();
      await supabase.from("users").update(userUpdates).eq("id", id);
    }

    if (changes.length === 0) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 }
      );
    }

    // Log activity
    await supabase.from("user_activity_log").insert({
      user_id: id,
      performed_by: user.id,
      action: "user_updated",
      metadata: { changes: body, fields: changes },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin user update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Log activity before deletion (profile will cascade-delete)
    await supabase.from("user_activity_log").insert({
      user_id: id,
      performed_by: user.id,
      action: "user_deleted",
      metadata: { deleted_by: user.id },
    });

    // Delete auth user (profile cascades via FK)
    const { error } = await supabase.auth.admin.deleteUser(id);

    if (error) {
      console.error("Admin user delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete user" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin user delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
