import { redirect } from "next/navigation";

export default async function RoastedStockDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/inventory/roasted/${id}`);
}
