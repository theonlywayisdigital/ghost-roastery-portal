import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DispatchPlanner } from "./DispatchPlanner";

export default async function DispatchPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  return <DispatchPlanner />;
}
