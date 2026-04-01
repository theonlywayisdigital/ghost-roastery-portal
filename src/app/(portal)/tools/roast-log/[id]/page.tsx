import { redirect } from "next/navigation";

export default async function EditRoastLogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/tools/inventory/roast-log/${id}`);
}
