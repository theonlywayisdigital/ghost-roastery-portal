import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { InboxPage } from "./InboxPage";

export default async function InboxRoute() {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) redirect("/login");

  return <InboxPage />;
}
