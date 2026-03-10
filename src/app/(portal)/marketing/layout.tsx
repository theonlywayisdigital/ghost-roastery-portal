import { getCurrentRoaster } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/login");

  return <>{children}</>;
}
