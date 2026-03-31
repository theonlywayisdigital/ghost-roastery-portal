import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

const HEADERS = [
  "First Name",
  "Last Name",
  "Email",
  "Phone",
  "Business Name",
  "Business Type",
  "Business Address",
  "Website",
  "VAT Number",
  "Monthly Volume",
  "Payment Terms",
  "Notes",
];

const EXAMPLE_1 = [
  "Jane",
  "Smith",
  "jane@dailygrind.com",
  "07700 900123",
  "The Daily Grind",
  "cafe",
  "12 High Street, Manchester, M1 1AA",
  "https://dailygrind.com",
  "GB123456789",
  "50kg",
  "net30",
  "",
];

const EXAMPLE_2 = [
  "Tom",
  "Richards",
  "tom@morningbrew.co.uk",
  "020 7946 0958",
  "Morning Brew Hotel",
  "hotel",
  "45 Park Lane, London, W1K 1PN",
  "",
  "",
  "25kg",
  "prepay",
  "Interested in house blend supply",
];

function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function toCsvRow(fields: string[]): string {
  return fields.map(escapeCsvField).join(",");
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lines = [toCsvRow(HEADERS), toCsvRow(EXAMPLE_1), toCsvRow(EXAMPLE_2)];
  const csv = lines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="wholesale-buyers-import-template.csv"',
    },
  });
}
