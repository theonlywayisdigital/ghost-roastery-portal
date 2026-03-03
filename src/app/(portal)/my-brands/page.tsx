import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { MyBrandsGrid } from "./MyBrandsGrid";
import { SavedLabelsSection } from "./SavedLabelsSection";

export default async function MyBrandsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createServerClient();

  // Get saved labels from label maker
  const { data: labels } = await supabase
    .from("labels")
    .select("id, name, thumbnail_url, pdf_url, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  // Get distinct brands from orders
  const { data: orders } = await supabase
    .from("orders")
    .select("brand_name, label_file_url, mockup_image_url, bag_colour")
    .eq("user_id", user.id)
    .not("brand_name", "is", null)
    .order("created_at", { ascending: false });

  // Deduplicate by brand_name, keeping the most recent
  const brandMap = new Map<
    string,
    {
      brandName: string;
      labelFileUrl: string | null;
      mockupImageUrl: string | null;
      bagColour: string;
      orderCount: number;
    }
  >();

  for (const order of orders || []) {
    if (!order.brand_name) continue;
    const existing = brandMap.get(order.brand_name);
    if (existing) {
      existing.orderCount++;
    } else {
      brandMap.set(order.brand_name, {
        brandName: order.brand_name,
        labelFileUrl: order.label_file_url,
        mockupImageUrl: order.mockup_image_url,
        bagColour: order.bag_colour,
        orderCount: 1,
      });
    }
  }

  const brands = Array.from(brandMap.values());

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">My Brands</h1>
      <p className="text-slate-500 mb-8">
        Your coffee brands and label files.
      </p>

      <SavedLabelsSection
        labels={labels ?? []}
        siteUrl={process.env.NEXT_PUBLIC_SITE_URL || ""}
      />

      <MyBrandsGrid brands={brands} />
    </>
  );
}
