import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { TicketDetail } from "./TicketDetail";

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  const { id } = await params;

  return <TicketDetail ticketId={id} />;
}
