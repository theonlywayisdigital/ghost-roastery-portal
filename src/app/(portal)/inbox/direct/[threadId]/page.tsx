import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DirectThreadPage } from "./DirectThreadPage";

interface Props {
  params: Promise<{ threadId: string }>;
}

export default async function DirectThreadRoute({ params }: Props) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) redirect("/login");

  const { threadId } = await params;
  return <DirectThreadPage threadId={decodeURIComponent(threadId)} />;
}
