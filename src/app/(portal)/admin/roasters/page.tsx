import { redirect } from "next/navigation";

export default function AdminRoastersPage() {
  redirect("/admin/users?tab=roasters");
}
