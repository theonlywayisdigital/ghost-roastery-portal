import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { getGRRoasterId } from "@/lib/gr-roaster";
import { AdminProductForm } from "../AdminProductForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminEditProductPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/login");

  const { id } = await params;
  const roasterId = await getGRRoasterId();
  const supabase = createServerClient();

  const { data: product } = await supabase
    .from("wholesale_products")
    .select("*")
    .eq("id", id)
    .eq("roaster_id", roasterId)
    .single();

  if (!product) notFound();

  return <AdminProductForm product={product} />;
}
