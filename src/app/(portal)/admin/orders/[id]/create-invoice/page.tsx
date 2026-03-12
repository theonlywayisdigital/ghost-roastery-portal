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

    initialData = {
      customerName: order.customer_name || undefined,
      customerEmail: order.customer_email || undefined,
      orderIds: [id],
      lineItems: [
        {
          description: `${order.quantity}× ${order.bag_size} ${order.bag_colour} ${order.roast_profile} (${order.grind})`,
          quantity: 1,
          unit_price: order.total_price,
        },
      ],
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

    initialData = {
      customerName: order.customer_name || undefined,
      customerEmail: order.customer_email || undefined,
      customerBusiness: order.customer_business || undefined,
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
