import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminRoasterDetail } from "./AdminRoasterDetail";

export default async function AdminRoasterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  const { id } = await params;

  return <AdminRoasterDetail roasterId={id} />;
}
