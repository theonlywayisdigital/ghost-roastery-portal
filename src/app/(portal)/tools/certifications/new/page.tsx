import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CertificationForm } from "../CertificationForm";

export default async function NewCertificationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  return <CertificationForm roasterId={user.roaster.id as string} />;
}
