import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

const CONTACT_HEADERS = [
  "First Name",
  "Last Name",
  "Email",
  "Phone",
  "Business Name",
  "Role",
  "Types",
  "Tags",
  "Address Line 1",
  "Address Line 2",
  "City",
  "County",
  "Postcode",
  "Country",
  "Notes",
];

const BUSINESS_HEADERS = [
  "Business Name",
  "Industry",
  "Email",
  "Phone",
  "Website",
  "Address Line 1",
  "Address Line 2",
  "City",
  "County",
  "Postcode",
  "Country",
  "Contact First Name",
  "Contact Last Name",
  "Contact Email",
  "Contact Phone",
  "Contact Role",
  "Types",
  "Notes",
];

const CONTACT_EXAMPLE_1 = [
  "Jane",
  "Smith",
  "jane@example.com",
  "07700 900123",
  "The Daily Grind",
  "Owner",
  "wholesale",
  "vip, local",
  "12 High Street",
  "",
  "Manchester",
  "Greater Manchester",
  "M1 1AA",
  "UK",
  "",
];

const CONTACT_EXAMPLE_2 = [
  "Alex",
  "Johnson",
  "alex.j@example.com",
  "07700 900456",
  "",
  "",
  "retail, lead",
  "",
  "",
  "",
  "London",
  "",
  "EC1A 1BB",
  "UK",
  "Met at coffee expo 2025",
];

const BUSINESS_EXAMPLE_1 = [
  "The Daily Grind",
  "cafe",
  "hello@dailygrind.com",
  "0161 123 4567",
  "https://dailygrind.com",
  "12 High Street",
  "",
  "Manchester",
  "Greater Manchester",
  "M1 1AA",
  "UK",
  "Jane",
  "Smith",
  "jane@dailygrind.com",
  "07700 900123",
  "Owner",
  "wholesale",
  "",
];

const BUSINESS_EXAMPLE_2 = [
  "Morning Brew Hotel",
  "hotel",
  "coffee@morningbrew.co.uk",
  "020 7946 0958",
  "",
  "45 Park Lane",
  "Floor 2",
  "London",
  "",
  "W1K 1PN",
  "UK",
  "Tom",
  "Richards",
  "tom@morningbrew.co.uk",
  "",
  "F&B Manager",
  "wholesale, lead",
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

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "contacts";

  const headers =
    type === "businesses" ? BUSINESS_HEADERS : CONTACT_HEADERS;
  const examples =
    type === "businesses"
      ? [BUSINESS_EXAMPLE_1, BUSINESS_EXAMPLE_2]
      : [CONTACT_EXAMPLE_1, CONTACT_EXAMPLE_2];

  const lines = [toCsvRow(headers), ...examples.map(toCsvRow)];
  const csv = lines.join("\n");

  const filename =
    type === "businesses"
      ? "businesses-import-template.csv"
      : "contacts-import-template.csv";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
