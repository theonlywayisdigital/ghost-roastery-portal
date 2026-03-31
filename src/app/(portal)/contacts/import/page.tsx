import { redirect } from "next/navigation";
import { getCurrentRoaster } from "@/lib/auth";
import { ContactsImportWizard } from "./ContactsImportWizard";

export default async function ContactsImportPage() {
  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/login");

  return <ContactsImportWizard />;
}
