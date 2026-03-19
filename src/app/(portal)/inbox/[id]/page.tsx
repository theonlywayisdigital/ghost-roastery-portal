import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { InboxDetailPage } from "./InboxDetailPage";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InboxDetailRoute({ params }: Props) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) redirect("/login");

  const { id } = await params;
  return <InboxDetailPage messageId={id} />;
}
