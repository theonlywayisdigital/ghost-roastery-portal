import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ContactDetail } from "./ContactDetail";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const { id } = await params;

  return <ContactDetail contactId={id} />;
}
