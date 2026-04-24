import { redirect, notFound } from "next/navigation";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { ProductForm } from "../ProductForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: Props) {
  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/login");

  const { id } = await params;
  const supabase = createServerClient();

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .single();

  if (!product) notFound();

  return <ProductForm product={product} />;
}
