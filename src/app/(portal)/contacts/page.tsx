import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ContactsCRM } from "./ContactsCRM";

export default async function ContactsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  return <ContactsCRM />;
}
