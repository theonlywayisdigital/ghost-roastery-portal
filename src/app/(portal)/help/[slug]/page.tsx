import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ArticleView } from "./ArticleView";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { slug } = await params;

  return <ArticleView slug={slug} />;
}
