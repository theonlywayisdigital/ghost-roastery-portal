import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ArticleEditor } from "../ArticleEditor";

export default async function NewArticlePage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  return <ArticleEditor />;
}
