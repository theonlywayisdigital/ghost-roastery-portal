import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roasterId: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { roasterId } = await params;
    const body = await request.json();
    const { country_code, country_name, region } = body;

    if (!country_code || !country_name) {
      return NextResponse.json(
        { error: "country_code and country_name are required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: territory, error } = await supabase
      .from("partner_territories")
      .insert({
        roaster_id: roasterId,
        country_code,
        country_name,
        region: region || null,
        assigned_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "This territory is already assigned to an active partner" },
          { status: 409 }
        );
      }
      console.error("Territory assign error:", error);
      return NextResponse.json({ error: "Failed to assign territory" }, { status: 500 });
    }

    return NextResponse.json({ territory });
  } catch (error) {
    console.error("Territory assign error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
