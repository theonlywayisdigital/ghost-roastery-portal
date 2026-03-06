import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { BrandingEditor } from "@/components/branding/BrandingEditor";
import { Palette } from "@/components/icons";

export default async function AdminBrandingSettingsPage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  const supabase = createServerClient();
  const { data: settings } = await supabase
    .from("platform_settings")
    .select(
      "brand_logo_url, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, brand_tagline"
    )
    .limit(1)
    .single();

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-5 h-5 text-slate-600" />
          <h1 className="text-2xl font-bold text-slate-900">
            Ghost Roastery Branding
          </h1>
        </div>
        <p className="text-sm text-slate-500">
          Brand identity for Ghost Roastery invoices, emails, and communications.
        </p>
      </div>
      <BrandingEditor
        apiEndpoint="/api/admin/settings/branding"
        businessName="Ghost Roastery"
        initialValues={{
          brand_logo_url: settings?.brand_logo_url || "",
          brand_primary_colour: settings?.brand_primary_colour || "#1A1A1A",
          brand_accent_colour: settings?.brand_accent_colour || "#D97706",
          brand_heading_font: settings?.brand_heading_font || "inter",
          brand_body_font: settings?.brand_body_font || "inter",
          brand_tagline: settings?.brand_tagline || "",
          business_name: "Ghost Roastery",
        }}
      />
    </div>
  );
}
