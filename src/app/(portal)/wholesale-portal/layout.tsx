import { getCurrentRoaster } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StorefrontTabs } from "./StorefrontTabs";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/login");

  const isSetupComplete = roaster.storefront_setup_complete as boolean;
  const slug = roaster.storefront_slug as string | null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Wholesale Portal</h1>
        {isSetupComplete && slug && (
          <p className="text-sm text-slate-500 mt-1">
            {slug}.roasteryplatform.com
          </p>
        )}
      </div>

      {isSetupComplete && <StorefrontTabs />}

      {children}
    </div>
  );
}
