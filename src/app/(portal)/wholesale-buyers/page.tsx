import { redirect } from "next/navigation";

export default function WholesaleBuyersRedirect() {
  redirect("/contacts?tab=wholesale");
}
