import { redirect } from "next/navigation";

export default async function GreenBeanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/inventory/green/${id}`);
}
