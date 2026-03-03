import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ArticleEditor } from "../../ArticleEditor";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  const { id } = await params;

  return <ArticleEditor articleId={id} />;
}
