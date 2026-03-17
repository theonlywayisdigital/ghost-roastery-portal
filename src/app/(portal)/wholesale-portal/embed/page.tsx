import { redirect } from "next/navigation";
import { getCurrentRoaster } from "@/lib/auth";
import { EmbedCodeGenerator } from "./EmbedCodeGenerator";

export default async function StorefrontEmbedPage() {
  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/login");
  if (!roaster.storefront_setup_complete) redirect("/wholesale-portal/setup");

  return (
    <EmbedCodeGenerator
      slug={roaster.storefront_slug as string}
      storefrontType={(roaster.storefront_type as string) || "wholesale"}
    />
  );
}
