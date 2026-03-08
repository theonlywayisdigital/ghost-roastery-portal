import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminWholesaleDetail } from "./AdminWholesaleDetail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminWholesaleDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/login");

  const { id } = await params;
  return <AdminWholesaleDetail accountId={id} />;
}
