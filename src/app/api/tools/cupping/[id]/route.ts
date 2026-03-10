import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();

  const { data: session, error } = await supabase
    .from("cupping_sessions")
    .select("*, cupping_samples(*, green_beans(name))")
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .single();

  if (error || !session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  // Sort samples by sample_number ascending
  if (session.cupping_samples && Array.isArray(session.cupping_samples)) {
    session.cupping_samples.sort(
      (a: Record<string, unknown>, b: Record<string, unknown>) =>
        (Number(a.sample_number) || 0) - (Number(b.sample_number) || 0)
    );
  }

  return NextResponse.json({ session });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { session_date, session_name, cupper_name, notes } = body;

  if (!session_name) return NextResponse.json({ error: "Session name is required" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("cupping_sessions")
    .update({
      session_date: session_date || null,
      session_name,
      cupper_name: cupper_name || null,
      notes: notes || null,
    })
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  return NextResponse.json({ session: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();

  // Delete session — cascade will delete samples
  const { error } = await supabase
    .from("cupping_sessions")
    .delete()
    .eq("id", id)
    .eq("roaster_id", roaster.id);

  if (error) return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  return NextResponse.json({ success: true });
}
