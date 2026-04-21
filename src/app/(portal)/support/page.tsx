import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { SupportTabs } from "./SupportTabs";

export default async function SupportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <Suspense>
      <SupportTabs />
    </Suspense>
  );
}
