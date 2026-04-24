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
  ShieldCheck,
  Globe,
  Link2,
  Mail,
  Percent,
} from "@/components/icons";
import { ReopenSetupGuide } from "@/components/onboarding/ReopenSetupGuide";

const settingsItems = [
  {
    href: "/settings/profile",
    label: "Profile",
    description: "Your account details and login information.",
    icon: UserCircle,
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
    description: "Logo, colours, fonts, and visual identity across your business.",
    icon: Palette,
    roasterOnly: true,
  },
  {
    href: "/settings/billing",
    label: "Billing",
    description: "Subscription plan, payment settings, and invoices.",
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
    href: "/settings/margin",
    label: "Margin Calculator",
    description: "Default markup multiplier, wholesale discount, and rounding rules.",
    icon: Percent,
    roasterOnly: true,
  },
  {
    href: "/settings/email-templates",
    label: "Email Templates",
    description: "Reusable templates for direct contact emails.",
    icon: Mail,
    roasterOnly: true,
  },
  {
    href: "/settings/domain",
    label: "Domain",
    description: "Wholesale portal URL, custom email domain, and inbox address.",
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

      {isRoaster && (
        <div className="mt-6">
          <ReopenSetupGuide />
        </div>
      )}
    </>
  );
}
