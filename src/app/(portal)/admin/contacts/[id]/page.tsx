import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminContactDetail } from "./AdminContactDetail";

export default async function AdminContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  const { id } = await params;

  return <AdminContactDetail contactId={id} />;
}
