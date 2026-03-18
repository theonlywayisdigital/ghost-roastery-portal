import { redirect } from "next/navigation";

export default async function GreenBeanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/tools/inventory/green/${id}`);
}
