import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { AddressList } from "./AddressList";

export default async function AddressesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createServerClient();

  // Get unique delivery addresses from orders
  const { data: orders } = await supabase
    .from("ghost_orders")
    .select("delivery_address")
    .eq("user_id", user.id)
    .not("delivery_address", "is", null)
    .order("created_at", { ascending: false });

  // Deduplicate addresses by line1 + postal_code
  const seen = new Set<string>();
  const addresses: Array<{
    name: string;
    line1: string;
    line2?: string;
    city: string;
    postalCode: string;
    country?: string;
  }> = [];

  for (const order of orders || []) {
    const addr = order.delivery_address as Record<string, string> | null;
    if (!addr || !addr.line1) continue;
    const key = `${addr.line1}|${addr.postal_code || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    addresses.push({
      name: addr.name || "",
      line1: addr.line1,
      line2: addr.line2 || undefined,
      city: addr.city || "",
      postalCode: addr.postal_code || "",
      country: addr.country || "GB",
    });
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Addresses</h1>
      <p className="text-slate-500 mb-8">
        Delivery addresses from your previous orders.
      </p>

      <AddressList addresses={addresses} />
    </>
  );
}
