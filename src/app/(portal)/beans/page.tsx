import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { BeansAgent } from "./BeansAgent";

const SHOWCASE_PROMPTS = [
  {
    title: "Bulk price updates",
    description: "Increase all product prices by 5% rounded to the nearest £0.50",
  },
  {
    title: "Smart order creation",
    description: "Create a draft order for my most recent contact with our best-selling product",
  },
  {
    title: "Wholesale management",
    description: "Approve all pending wholesale buyers and send them a welcome discount code",
  },
  {
    title: "Inventory awareness",
    description: "Show me all roasted stock profiles running low and the green beans they use",
  },
];

export default async function BeansPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roles.includes("roaster")) redirect("/dashboard");

  const salesTier = (user.roaster?.sales_tier as string) || "growth";
  const isScale = salesTier === "scale";

  if (!isScale) {
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

        <div className="max-w-2xl mx-auto pt-8">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg
                viewBox="0 0 24 24"
                className="w-9 h-9 text-amber-700"
                fill="currentColor"
              >
                <ellipse cx="12" cy="12" rx="5" ry="8" transform="rotate(-30 12 12)" opacity="0.6" />
                <ellipse cx="12" cy="12" rx="5" ry="8" transform="rotate(30 12 12)" opacity="0.6" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Meet Beans — your AI assistant
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Beans understands your products, contacts, inventory, and orders.
              Tell it what to do in plain English and it builds an action plan for you to review and approve.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
            {SHOWCASE_PROMPTS.map((prompt) => (
              <div
                key={prompt.title}
                className="bg-white border border-slate-200 rounded-xl p-4"
              >
                <p className="text-sm font-medium text-slate-900 mb-1">
                  {prompt.title}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  &ldquo;{prompt.description}&rdquo;
                </p>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <p className="text-sm font-medium text-amber-900 mb-1">
              Beans is available on the Scale plan
            </p>
            <p className="text-xs text-amber-700 mb-4">
              Upgrade your Sales Suite to Scale to unlock Beans and automate your roastery operations.
            </p>
            <Link
              href="/settings/billing?tab=subscription"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
            >
              Upgrade to Scale
            </Link>
          </div>
        </div>
      </>
    );
  }

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
