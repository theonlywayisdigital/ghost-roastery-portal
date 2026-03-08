import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminProductForm } from "../AdminProductForm";

export default async function AdminNewProductPage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/login");

  return <AdminProductForm />;
}
