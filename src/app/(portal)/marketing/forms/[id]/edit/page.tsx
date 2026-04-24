import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { FormBuilder } from "./FormBuilder";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const marketingTier = (user.roaster as Record<string, unknown> | null)?.marketing_tier as string | undefined;

  return <FormBuilder formId={id} marketingTier={marketingTier || "growth"} />;
}
