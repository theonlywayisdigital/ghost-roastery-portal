import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PipelineBoard } from "@/components/shared/pipeline";

export default async function AdminPipelinePage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sales Pipeline</h1>
        <p className="text-sm text-slate-500 mt-1">
          Ghost Roastery leads pipeline
        </p>
      </div>

      <PipelineBoard
        apiBase="/api/admin/contacts"
        detailBase="/admin/contacts"
        businessDetailBase="/admin/businesses"
      />
    </div>
  );
}
