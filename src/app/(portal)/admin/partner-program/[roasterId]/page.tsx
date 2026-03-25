import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminPartnerDetail } from "./AdminPartnerDetail";

interface Props {
  params: Promise<{ roasterId: string }>;
}

export default async function AdminPartnerDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  const { roasterId } = await params;

  return <AdminPartnerDetail roasterId={roasterId} />;
}

export const metadata = {
  title: "Partner Detail | Roastery Platform Admin",
};
