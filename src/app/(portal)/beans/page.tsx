import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BeansAgent } from "./BeansAgent";

export default async function BeansPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roles.includes("roaster")) redirect("/dashboard");

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 text-amber-700"
              fill="currentColor"
            >
              <ellipse cx="12" cy="12" rx="5" ry="8" transform="rotate(-30 12 12)" opacity="0.6" />
              <ellipse cx="12" cy="12" rx="5" ry="8" transform="rotate(30 12 12)" opacity="0.6" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Beans</h1>
            <p className="text-sm text-slate-500">Your roastery AI</p>
          </div>
        </div>
      </div>
      <BeansAgent />
    </>
  );
}
