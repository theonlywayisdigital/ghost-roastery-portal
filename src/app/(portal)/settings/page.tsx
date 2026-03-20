import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import {
  UserCircle,
  Building2,
  Palette,
  CreditCard,
  Truck,
  Users,
  Bell,
  Crown,
  ShieldCheck,
  Coffee,
  Funnel,
  Globe,
  Link2,
} from "@/components/icons";

const settingsItems = [
  {
    href: "/settings/profile",
    label: "Profile",
    description: "Your account details and login information.",
    icon: UserCircle,
  },
  {
    href: "/settings/billing?tab=subscription",
    label: "Subscription",
    description: "Manage your plan and view usage limits.",
    icon: Crown,
    roasterOnly: true,
  },
  {
    href: "/settings/business",
    label: "Business Info",
    description: "Your business name, address, and contact details.",
    icon: Building2,
    roasterOnly: true,
  },
  {
    href: "/settings/branding",
    label: "Branding",
    description: "Logo, colours, and visual identity for your storefront.",
    icon: Palette,
    roasterOnly: true,
  },
  {
    href: "/settings/billing",
    label: "Billing & Payouts",
    description: "Subscription plan, payout history, and invoices.",
    icon: CreditCard,
    roasterOnly: true,
  },
  {
    href: "/settings/shipping",
    label: "Shipping",
    description: "Shipping rates, zones, and dispatch times.",
    icon: Truck,
    roasterOnly: true,
  },
  {
    href: "/settings/grind-types",
    label: "Grind Types",
    description: "Manage grind options available for your products.",
    icon: Coffee,
    roasterOnly: true,
  },
  {
    href: "/settings/pipeline-stages",
    label: "Pipeline Stages",
    description: "Customise your sales pipeline stages.",
    icon: Funnel,
    roasterOnly: true,
  },
  {
    href: "/settings/domain",
    label: "Domain",
    description: "Storefront URL, custom email domain, and inbox address.",
    icon: Globe,
    roasterOnly: true,
  },
  {
    href: "/settings/integrations",
    label: "Integrations",
    description: "Payments, accounting, ecommerce connections, and webhooks.",
    icon: Link2,
    roasterOnly: true,
  },
  {
    href: "/settings/security",
    label: "Security",
    description: "Two-factor authentication and account security.",
    icon: ShieldCheck,
  },
  {
    href: "/settings/team",
    label: "Team Management",
    description: "Invite team members and manage access.",
    icon: Users,
  },
  {
    href: "/settings/notifications",
    label: "Notifications",
    description: "Email and notification preferences.",
    icon: Bell,
  },
];

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isRoaster = user.roles.includes("roaster");

  const visibleItems = settingsItems.filter(
    (item) => !item.roasterOnly || isRoaster
  );

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-brand-50 transition-colors">
                  <Icon className="w-5 h-5 text-slate-500 group-hover:text-brand-600 transition-colors" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {item.label}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {item.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
