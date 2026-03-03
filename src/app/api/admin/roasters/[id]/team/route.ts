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

  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Fetch team members for the roaster
    const { data: teamMembers, error } = await supabase
      .from("team_members")
      .select("id, user_id, role, created_at")
      .eq("roaster_id", id);

    if (error) {
      console.error("Team members fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch team members" },
        { status: 500 }
      );
    }

    // Enrich with auth user data
    const members = await Promise.all(
      (teamMembers || []).map(async (member) => {
        let email: string | null = null;
        let fullName: string | null = null;

        if (member.user_id) {
          const { data: userData } = await supabase.auth.admin.getUserById(
            member.user_id
          );
          if (userData?.user) {
            email = userData.user.email || null;
            fullName = userData.user.user_metadata?.full_name || null;
          }
        }

        return {
          id: member.id,
          user_id: member.user_id,
          email,
          full_name: fullName,
          role: member.role,
          created_at: member.created_at,
        };
      })
    );

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Team members fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
