import { redirect } from "next/navigation";
import { getCurrentRoaster } from "@/lib/auth";
import { getStorefrontUrl } from "@/lib/storefront-url";
import { EmbedCodeGenerator } from "./EmbedCodeGenerator";

export default async function StorefrontEmbedPage() {
  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/login");
  if (!roaster.storefront_setup_complete) redirect("/wholesale-portal/setup");

  const slug = roaster.storefront_slug as string;
  const embedSettings = (roaster.embed_settings as Record<string, unknown>) || {};
  const accentColour = (roaster.brand_accent_colour as string) || "#0083dc";

  return (
    <EmbedCodeGenerator
      slug={slug}
      storefrontType={(roaster.storefront_type as string) || "wholesale"}
      storefrontUrl={getStorefrontUrl(slug)}
      embedUrl={getStorefrontUrl(slug, "/embed/wholesale-apply")}
      embedSettings={embedSettings}
      accentColour={accentColour}
    />
  );
}
