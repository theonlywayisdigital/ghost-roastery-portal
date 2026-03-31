import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

const GREEN_BEAN_HEADERS = [
  "Name",
  "Origin Country",
  "Origin Region",
  "Variety",
  "Process",
  "Lot Number",
  "Supplier",
  "Arrival Date",
  "Cost per kg",
  "Cupping Score",
  "Tasting Notes",
  "Altitude (masl)",
  "Harvest Year",
  "Current Stock (kg)",
  "Low Stock Threshold (kg)",
  "Notes",
];

const ROASTED_STOCK_HEADERS = [
  "Name",
  "Source Green Bean",
  "Current Stock (kg)",
  "Low Stock Threshold (kg)",
  "Batch Size (kg)",
  "Notes",
];

const GREEN_BEAN_EXAMPLE_1 = [
  "Ethiopian Yirgacheffe Kochere",
  "Ethiopia",
  "Yirgacheffe",
  "Heirloom",
  "Washed",
  "ETH-2025-001",
  "Falcon Speciality",
  "2025-01-15",
  "8.50",
  "87",
  "Blueberry, Jasmine, Citrus",
  "1950",
  "2024",
  "25",
  "5",
  "",
];

const GREEN_BEAN_EXAMPLE_2 = [
  "Colombia Huila Supremo",
  "Colombia",
  "Huila",
  "Caturra",
  "Natural",
  "COL-2025-003",
  "",
  "2025-02-20",
  "7.20",
  "85",
  "Cherry, Chocolate, Caramel",
  "1700",
  "2024",
  "40",
  "10",
  "Micro-lot from Finca La Esperanza",
];

const ROASTED_STOCK_EXAMPLE_1 = [
  "House Blend",
  "",
  "15",
  "3",
  "12",
  "",
];

const ROASTED_STOCK_EXAMPLE_2 = [
  "Single Origin Ethiopia",
  "Ethiopian Yirgacheffe Kochere",
  "8.5",
  "2",
  "6",
  "Light roast profile",
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
  const type = searchParams.get("type") || "green_beans";

  const headers = type === "roasted_stock" ? ROASTED_STOCK_HEADERS : GREEN_BEAN_HEADERS;
  const examples =
    type === "roasted_stock"
      ? [ROASTED_STOCK_EXAMPLE_1, ROASTED_STOCK_EXAMPLE_2]
      : [GREEN_BEAN_EXAMPLE_1, GREEN_BEAN_EXAMPLE_2];

  const lines = [toCsvRow(headers), ...examples.map(toCsvRow)];
  const csv = lines.join("\n");

  const filename =
    type === "roasted_stock"
      ? "roasted-stock-import-template.csv"
      : "green-beans-import-template.csv";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
