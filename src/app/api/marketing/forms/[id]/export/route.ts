import { NextRequest, NextResponse } from "next/server";
import { getMarketingOwner, applyOwnerFilter } from "@/lib/marketing-auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  // Verify ownership and get form fields
  const { data: form } = await applyOwnerFilter(
    supabase.from("forms").select("id, name, fields").eq("id", id),
    owner
  ).single();

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const { data: submissions } = await supabase
    .from("form_submissions")
    .select("data, source, consent_given, email_verified, created_at")
    .eq("form_id", id)
    .order("created_at", { ascending: false });

  if (!submissions || submissions.length === 0) {
    return new NextResponse("No submissions to export", { status: 200 });
  }

  // Build CSV
  const fields = (form.fields as { id: string; label: string }[]) || [];
  const headers = [
    ...fields.map((f) => f.label),
    "Source",
    "Consent",
    "Verified",
    "Submitted",
  ];

  const rows = submissions.map((sub) => {
    const data = sub.data as Record<string, unknown>;
    return [
      ...fields.map((f) => {
        const val = data[f.id];
        if (val === null || val === undefined) return "";
        if (Array.isArray(val)) return val.join("; ");
        return String(val);
      }),
      sub.source,
      sub.consent_given ? "Yes" : "No",
      sub.email_verified ? "Yes" : "No",
      new Date(sub.created_at).toISOString(),
    ];
  });

  const csvLines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ];

  const csv = csvLines.join("\n");
  const filename = `${form.name.replace(/[^a-zA-Z0-9]/g, "_")}_submissions.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
