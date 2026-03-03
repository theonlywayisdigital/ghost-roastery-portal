import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminBusinessDetail } from "./AdminBusinessDetail";

export default async function AdminBusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  const { id } = await params;

  return <AdminBusinessDetail businessId={id} />;
}
