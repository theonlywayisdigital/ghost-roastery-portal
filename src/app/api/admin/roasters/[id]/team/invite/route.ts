import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST(
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
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Create the invite
    const { data: invite, error } = await supabase
      .from("team_invites")
      .insert({
        roaster_id: id,
        email,
        role,
        invited_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Team invite error:", error);
      return NextResponse.json(
        { error: "Failed to create invite" },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from("roaster_activity").insert({
      roaster_id: id,
      author_id: user.id,
      activity_type: "team_invite_sent",
      description: `Invited ${email} as ${role}`,
      metadata: { invite_id: invite.id, email, role },
    });

    return NextResponse.json({ invite });
  } catch (error) {
    console.error("Team invite error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
