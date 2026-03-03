import { SubmissionsPage } from "./SubmissionsPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SubmissionsPage formId={id} />;
}
