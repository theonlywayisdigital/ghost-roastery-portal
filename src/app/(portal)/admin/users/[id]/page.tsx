import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminUserDetail } from "./AdminUserDetail";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  const { id } = await params;

  return <AdminUserDetail userId={id} />;
}
