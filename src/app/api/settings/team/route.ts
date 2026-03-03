import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const user = await getCurrentUser();
  const roaster = await getCurrentRoaster();
  if (!user || !roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Get team members
  const { data: members, error: membersError } = await supabase
    .from("team_members")
    .select("id, user_id, role, joined_at")
    .eq("roaster_id", roaster.id)
    .order("role", { ascending: true });

  if (membersError) {
    console.error("Team members fetch error:", membersError);
    return NextResponse.json(
      { error: "Failed to fetch team" },
      { status: 500 }
    );
  }

  // Enrich with user details from auth
  const enrichedMembers = [];
  for (const member of members || []) {
    const { data: authData } = await supabase.auth.admin.getUserById(
      member.user_id
    );
    enrichedMembers.push({
      id: member.id,
      user_id: member.user_id,
      role: member.role,
      joined_at: member.joined_at,
      email: authData?.user?.email || "",
      name:
        authData?.user?.user_metadata?.full_name ||
        [
          authData?.user?.user_metadata?.first_name,
          authData?.user?.user_metadata?.last_name,
        ]
          .filter(Boolean)
          .join(" ") ||
        authData?.user?.email ||
        "",
      is_current_user: member.user_id === user.id,
    });
  }

  // If no members yet, add the current user as owner
  if (enrichedMembers.length === 0) {
    const { error: insertError } = await supabase
      .from("team_members")
      .insert({
        roaster_id: roaster.id,
        user_id: user.id,
        role: "owner",
      });

    if (!insertError) {
      enrichedMembers.push({
        id: "self",
        user_id: user.id,
        role: "owner",
        joined_at: new Date().toISOString(),
        email: user.email,
        name: user.fullName || user.email,
        is_current_user: true,
      });
    }
  }

  // Get pending invites
  const { data: invites } = await supabase
    .from("team_invites")
    .select("id, email, role, status, created_at, expires_at")
    .eq("roaster_id", roaster.id)
    .in("status", ["pending"])
    .order("created_at", { ascending: false });

  return NextResponse.json({
    members: enrichedMembers,
    invites: invites || [],
  });
}
