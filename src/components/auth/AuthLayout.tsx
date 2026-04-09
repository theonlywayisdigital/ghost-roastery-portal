import { Logo } from "@/components/Logo";
import { Check } from "@/components/icons";

const BENEFITS = [
  "Manage wholesale orders, invoices, and CRM in one place",
  "Connect Shopify, WooCommerce, Xero, and more",
  "AI-powered marketing — emails, social, and content",
  "14-day free trial — no credit card to sign up",
];

interface AuthLayoutProps {
  children: React.ReactNode;
  showMobileLogo?: boolean;
}

export function AuthLayout({ children, showMobileLogo = true }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left — brand panel */}
      <div className="hidden md:flex md:w-1/2 lg:w-[45%] bg-gradient-to-br from-brand-900 to-brand-700 p-12 flex-col justify-center">
        <div className="max-w-md mx-auto">
          <Logo variant="white" height={48} className="h-12 w-auto mb-10" />
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-8 leading-tight">
            The all-in-one platform for coffee roasters
          </h2>
          <ul className="space-y-4">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Check className="h-3 w-3 text-white" />
                </span>
                <span className="text-sm text-white/90 leading-relaxed">{benefit}</span>
              </li>
            ))}
          </ul>
          <p className="mt-12 text-xs text-white/50">
            Trusted by independent roasters across the UK
          </p>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md">
          {showMobileLogo && (
            <div className="flex justify-center mb-8 md:hidden">
              <Logo variant="stacked" height={120} className="h-[120px] w-auto" />
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
