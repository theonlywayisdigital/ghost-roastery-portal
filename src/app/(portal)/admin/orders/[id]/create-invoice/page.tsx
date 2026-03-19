import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { InvoiceEditor } from "@/components/invoices/InvoiceEditor";
import type { InvoiceInitialData } from "@/components/invoices/InvoiceEditor";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function AdminCreateInvoiceFromOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  const { id } = await params;
  const { type } = await searchParams;
  const orderType = type || "ghost";
  const isGhost = orderType === "ghost";

  const supabase = createServerClient();

  let initialData: InvoiceInitialData;

  if (isGhost) {
    const { data: order } = await supabase
      .from("ghost_orders")
      .select("*")
      .eq("id", id)
      .single();

    if (!order) redirect("/admin/orders");

    // Resolve customer_id (people record) from ghost order
    let customerId: string | undefined;
    if (order.customer_email) {
      const { data: person } = await supabase
        .from("people")
        .select("id")
        .eq("email", order.customer_email.toLowerCase())
        .maybeSingle();
      if (person) customerId = person.id;
    }

    // Properly itemise ghost order line items (per-bag pricing)
    const lineItems = [
      {
        description: `${order.bag_size} ${order.bag_colour} ${order.roast_profile} (${order.grind})`,
        quantity: order.quantity,
        unit_price: Number(order.price_per_bag),
      },
    ];

    initialData = {
      customerId,
      customerName: order.customer_name || undefined,
      customerEmail: order.customer_email || undefined,
      orderIds: [id],
      lineItems,
      dueDays: 30,
    };
  } else {
    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (!order) redirect("/admin/orders");

    // If order already has an invoice, redirect to the order page
    if (order.invoice_id) {
      redirect(`/admin/orders/${id}?type=${orderType}`);
    }

    const items = (order.items as any[]) || [];
    const lineItems = items.map((item: any) => {
      const name = item.name || item.product_name || "Product";
      const qty = item.quantity || 1;
      const unitPrice = item.unit_price || (item.unitAmount ? item.unitAmount / 100 : 0);
      return {
        description: `${name}${item.unit ? ` (${item.unit})` : ""}`,
        quantity: qty,
        unit_price: unitPrice,
      };
    });

    // Derive due days from payment_terms
    const termsMap: Record<string, number> = {
      net7: 7,
      net14: 14,
      net30: 30,
    };
    const dueDays = termsMap[order.payment_terms] || 30;

    // Resolve customer_id and business_id from order's user
    let customerId: string | undefined;
    let businessId: string | undefined;
    let wholesaleAccessId: string | undefined;
    let customerBusiness: string | undefined = order.customer_business || undefined;

    if (order.wholesale_access_id) {
      wholesaleAccessId = order.wholesale_access_id;
      const { data: access } = await supabase
        .from("wholesale_access")
        .select("business_id, business_name")
        .eq("id", order.wholesale_access_id)
        .single();
      if (access) {
        if (access.business_id) businessId = access.business_id;
        if (!customerBusiness && access.business_name) customerBusiness = access.business_name;
      }
    }

    if (order.user_id) {
      const { data: userRow } = await supabase
        .from("users")
        .select("email")
        .eq("id", order.user_id)
        .single();

      if (userRow?.email) {
        const { data: person } = await supabase
          .from("people")
          .select("id")
          .eq("email", userRow.email.toLowerCase())
          .maybeSingle();
        if (person) customerId = person.id;
      }
    }

    initialData = {
      customerId,
      businessId,
      wholesaleAccessId,
      customerName: order.customer_name || undefined,
      customerEmail: order.customer_email || undefined,
      customerBusiness,
      orderIds: [id],
      lineItems: lineItems.length > 0 ? lineItems : undefined,
      dueDays,
      paymentMethod: order.payment_method || "invoice_offline",
    };
  }

  return (
    <InvoiceEditor
      ownerType={isGhost ? "ghost_roastery" : "roaster"}
      backHref={`/admin/orders/${id}?type=${orderType}`}
      successHref={`/admin/orders/${id}?type=${orderType}`}
      initialData={initialData}
    />
  );
}
