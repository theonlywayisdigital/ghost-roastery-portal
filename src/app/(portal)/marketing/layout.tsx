import { getCurrentRoaster } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MarketingNav } from "./MarketingNav";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/login");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Marketing</h1>
        <p className="text-sm text-slate-500 mt-1">
          Content calendar, campaigns, social media, and growth tools.
        </p>
      </div>

      <MarketingNav />

      {children}
    </div>
  );
}
