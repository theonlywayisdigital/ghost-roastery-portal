import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminPartnerProgram } from "./AdminPartnerProgram";

export default async function AdminPartnerProgramPage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  return <AdminPartnerProgram />;
}

export const metadata = {
  title: "Partner Program | Ghost Roastery Admin",
};
