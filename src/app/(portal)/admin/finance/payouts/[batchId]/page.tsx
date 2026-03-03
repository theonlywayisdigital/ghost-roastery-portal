import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PayoutBatchDetail } from "./PayoutBatchDetail";

export default async function PayoutBatchDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  const { batchId } = await params;
  return <PayoutBatchDetail batchId={batchId} />;
}
