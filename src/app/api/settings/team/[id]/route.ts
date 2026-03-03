import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// Update team member role or cancel invite
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const roaster = await getCurrentRoaster();
  if (!user || !roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { role } = body;

    if (!["admin", "staff"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be admin or staff" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Can't change own role
    const { data: member } = await supabase
      .from("team_members")
      .select("user_id, role")
      .eq("id", id)
      .eq("roaster_id", roaster.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (member.user_id === user.id) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 }
      );
    }

    if (member.role === "owner") {
      return NextResponse.json(
        { error: "Cannot change the owner's role" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("team_members")
      .update({ role })
      .eq("id", id)
      .eq("roaster_id", roaster.id);

    if (error) {
      console.error("Role update error:", error);
      return NextResponse.json(
        { error: "Failed to update role" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Team member update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Remove team member or cancel invite
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const roaster = await getCurrentRoaster();
  if (!user || !roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Try team_members first
    const { data: member } = await supabase
      .from("team_members")
      .select("user_id, role")
      .eq("id", id)
      .eq("roaster_id", roaster.id)
      .single();

    if (member) {
      if (member.user_id === user.id) {
        return NextResponse.json(
          { error: "You cannot remove yourself" },
          { status: 400 }
        );
      }
      if (member.role === "owner") {
        return NextResponse.json(
          { error: "Cannot remove the owner" },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", id)
        .eq("roaster_id", roaster.id);

      if (error) {
        return NextResponse.json(
          { error: "Failed to remove member" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // Try team_invites (cancel invite)
    const { error: inviteError } = await supabase
      .from("team_invites")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("roaster_id", roaster.id);

    if (inviteError) {
      return NextResponse.json(
        { error: "Failed to cancel invite" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Team member delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
