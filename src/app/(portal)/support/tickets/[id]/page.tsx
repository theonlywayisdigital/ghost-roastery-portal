import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { TicketView } from "./TicketView";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  return <TicketView ticketId={id} />;
}
