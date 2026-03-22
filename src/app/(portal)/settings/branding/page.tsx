import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { SettingsHeader } from "@/components/SettingsHeader";
import { BrandingEditor } from "@/components/branding/BrandingEditor";

export default async function BrandingSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/settings");

  const supabase = createServerClient();
  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select(
      "business_name, brand_logo_url, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, brand_tagline"
    )
    .eq("id", user.roaster.id)
    .single();

  if (!roaster) redirect("/settings");

  return (
    <div>
      <SettingsHeader
        title="Branding"
        description="Your brand identity across invoices, emails, and your wholesale portal"
        breadcrumb="Branding"
      />
      <BrandingEditor
        apiEndpoint="/api/settings/branding"
        businessName={roaster.business_name || ""}
        businessNameEditHref="/settings/business"
        initialValues={{
          brand_logo_url: roaster.brand_logo_url || "",
          brand_primary_colour: roaster.brand_primary_colour || "#1A1A1A",
          brand_accent_colour: roaster.brand_accent_colour || "#D97706",
          brand_heading_font: roaster.brand_heading_font || "inter",
          brand_body_font: roaster.brand_body_font || "inter",
          brand_tagline: roaster.brand_tagline || "",
          business_name: roaster.business_name || "",
        }}
      />
    </div>
  );
}
