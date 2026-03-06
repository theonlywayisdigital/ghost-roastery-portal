import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function WebsiteSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Website Settings</h1>
      <p className="text-slate-500 text-sm mb-6">
        Configure your website title, SEO defaults, and analytics.
      </p>

      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <p className="text-slate-500">
          Website settings coming soon.
        </p>
      </div>
    </div>
  );
}
