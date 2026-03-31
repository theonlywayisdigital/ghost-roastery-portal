import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { ContactPage } from "./ContactPage";

export const dynamic = "force-dynamic";

export default async function ContactPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServerClient();

  const { data: roaster } = await supabase
    .from("roasters")
    .select(
      "id, business_name, brand_logo_url, storefront_contact_email, storefront_contact_phone, storefront_contact_address, storefront_enabled, storefront_type"
    )
    .eq("storefront_slug", slug)
    .eq("storefront_enabled", true)
    .single();

  if (!roaster) notFound();

  return (
    <ContactPage
      roaster={{
        id: roaster.id,
        businessName: roaster.business_name,
        contactEmail: roaster.storefront_contact_email,
        contactPhone: roaster.storefront_contact_phone,
        contactAddress: roaster.storefront_contact_address,
        storefrontType: roaster.storefront_type,
      }}
    />
  );
}
