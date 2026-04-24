import { redirect } from "next/navigation";

export default async function EditRoastedStockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/inventory/roasted/${id}/edit`);
}
