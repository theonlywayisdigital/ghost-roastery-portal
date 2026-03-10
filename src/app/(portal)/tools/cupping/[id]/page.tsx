import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { CuppingSession } from "./CuppingSession";

export default async function CuppingSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const { id } = await params;
  const supabase = createServerClient();

  const [{ data: session }, { data: greenBeans }, { data: roastLogs }] = await Promise.all([
    supabase
      .from("cupping_sessions")
      .select("*, cupping_samples(*, green_beans(name))")
      .eq("id", id)
      .eq("roaster_id", user.roaster.id)
      .single(),
    supabase
      .from("green_beans")
      .select("id, name")
      .eq("roaster_id", user.roaster.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("roast_logs")
      .select("id, roast_label, roast_date")
      .eq("roaster_id", user.roaster.id)
      .order("roast_date", { ascending: false })
      .limit(100),
  ]);

  if (!session) notFound();

  // Sort samples by sample_number
  if (session.cupping_samples && Array.isArray(session.cupping_samples)) {
    session.cupping_samples.sort(
      (a: Record<string, unknown>, b: Record<string, unknown>) =>
        (Number(a.sample_number) || 0) - (Number(b.sample_number) || 0)
    );
  }

  return (
    <CuppingSession
      session={session}
      greenBeans={greenBeans || []}
      roastLogs={roastLogs || []}
    />
  );
}
