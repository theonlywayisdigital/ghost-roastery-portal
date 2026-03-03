import { CampaignEditor } from "../../CampaignEditor";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CampaignEditor campaignId={id} />;
}
