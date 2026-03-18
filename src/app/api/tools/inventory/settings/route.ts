import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { default_batch_size_kg } = body as {
    default_batch_size_kg: number | null;
  };

  const supabase = createServerClient();
  const { error } = await supabase
    .from("partner_roasters")
    .update({ default_batch_size_kg })
    .eq("id", user.roaster.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
