import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { GreenBeanForm } from "../../../green-beans/GreenBeanForm";

export default async function NewGreenBeanPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const supabase = createServerClient();
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, name")
    .eq("roaster_id", user.roaster.id)
    .eq("is_active", true)
    .order("name");

  return <GreenBeanForm suppliers={suppliers || []} />;
}
