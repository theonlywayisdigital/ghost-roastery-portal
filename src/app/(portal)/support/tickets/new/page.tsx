import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CreateTicket } from "./CreateTicket";

export default async function NewTicketPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isRoaster = user.roles.includes("roaster");

  return <CreateTicket isRoaster={isRoaster} />;
}
