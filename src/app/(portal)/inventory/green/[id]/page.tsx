import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { GreenBeanDetail } from "../../_components/green-beans/[id]/GreenBeanDetail";

export default async function GreenBeanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const { id } = await params;
  const supabase = createServerClient();

  const [{ data: bean }, { data: movements }, { data: suppliers }] = await Promise.all([
    supabase.from("green_beans").select("*, suppliers(id, name)").eq("id", id).eq("roaster_id", user.roaster.id).single(),
    supabase.from("green_bean_movements").select("*").eq("green_bean_id", id).eq("roaster_id", user.roaster.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("suppliers").select("id, name").eq("roaster_id", user.roaster.id).eq("is_active", true).order("name"),
  ]);

  if (!bean) notFound();

  return <GreenBeanDetail bean={bean} movements={movements || []} suppliers={suppliers || []} />;
}
