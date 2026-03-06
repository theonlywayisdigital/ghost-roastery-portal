import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BusinessDetail } from "./BusinessDetail";
import { Loader2 } from "@/components/icons";

export default async function BusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const { id } = await params;

  return (
    <Suspense fallback={<div className="flex items-center justify-center py-32"><Loader2 className="w-6 h-6 text-slate-400 animate-spin" /></div>}>
      <BusinessDetail businessId={id} />
    </Suspense>
  );
}
