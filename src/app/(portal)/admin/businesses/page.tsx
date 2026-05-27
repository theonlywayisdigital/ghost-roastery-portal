import { redirect } from "next/navigation";

export default function AdminBusinessesPage() {
  redirect("/admin/contacts?tab=businesses");
}
