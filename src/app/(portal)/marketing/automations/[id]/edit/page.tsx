import { AutomationEditor } from "./AutomationEditor";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AutomationEditor automationId={id} />;
}
