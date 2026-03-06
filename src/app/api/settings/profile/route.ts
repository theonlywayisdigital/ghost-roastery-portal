import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAuthServerClient } from "@/lib/supabase";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createAuthServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  return NextResponse.json({
    id: user.id,
    email: user.email,
    first_name: authUser?.user_metadata?.first_name || "",
    last_name: authUser?.user_metadata?.last_name || "",
    phone: authUser?.user_metadata?.phone || "",
    avatar_url: authUser?.user_metadata?.avatar_url || null,
  });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { first_name, last_name, phone, avatar_url } = body;

    const supabase = await createAuthServerClient();
    const { error } = await supabase.auth.updateUser({
      data: {
        first_name: first_name || "",
        last_name: last_name || "",
        full_name: [first_name, last_name].filter(Boolean).join(" ") || "",
        phone: phone || "",
        ...(avatar_url !== undefined ? { avatar_url } : {}),
      },
    });

    if (error) {
      console.error("Profile update error:", error);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
