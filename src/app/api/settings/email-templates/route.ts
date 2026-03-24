import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data: templates, error } = await supabase
    .from("contact_email_templates")
    .select("*")
    .eq("roaster_id", roaster.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Email templates fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch email templates" }, { status: 500 });
  }

  return NextResponse.json({ templates: templates || [] });
}

export async function POST(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, subject, body: templateBody } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: template, error } = await supabase
      .from("contact_email_templates")
      .insert({
        roaster_id: roaster.id,
        name: name.trim(),
        subject: (subject || "").trim(),
        body: (templateBody || "").trim(),
      })
      .select()
      .single();

    if (error) {
      console.error("Email template creation error:", error);
      return NextResponse.json({ error: "Failed to create email template" }, { status: 500 });
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Email template creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
