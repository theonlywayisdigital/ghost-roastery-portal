import { CampaignReport } from "../../CampaignReport";

export default async function CampaignReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CampaignReport campaignId={id} />;
}
