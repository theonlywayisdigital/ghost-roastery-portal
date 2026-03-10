import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { CertificationForm } from "../CertificationForm";

export default async function EditCertificationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const { id } = await params;
  const supabase = createServerClient();

  const { data: certification } = await supabase
    .from("certifications")
    .select("*")
    .eq("id", id)
    .eq("roaster_id", user.roaster.id)
    .single();

  if (!certification) notFound();

  const formData = {
    id: certification.id,
    cert_name: certification.cert_name || "",
    cert_type: certification.cert_type || "",
    certificate_number: certification.certificate_number || "",
    issuing_body: certification.issuing_body || "",
    issue_date: certification.issue_date || "",
    expiry_date: certification.expiry_date || "",
    reminder_days: certification.reminder_days != null ? String(certification.reminder_days) : "30",
    document_url: certification.document_url || "",
    document_name: certification.document_name || "",
    notes: certification.notes || "",
  };

  return <CertificationForm certification={formData} roasterId={user.roaster.id as string} />;
}
