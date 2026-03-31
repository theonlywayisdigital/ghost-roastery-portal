import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

const COFFEE_HEADERS = [
  "Product Name",
  "Description",
  "Origin",
  "Tasting Notes",
  "SKU",
  "Retail Price",
  "Wholesale Price",
  "Weight",
  "Grind Type",
  "Retail Stock Count",
  "Track Stock",
  "Status",
  "Image URL",
  "Is Retail",
  "Is Wholesale",
  "Minimum Wholesale Quantity",
  "Brand",
  "GTIN",
  "VAT Rate",
];

const OTHER_HEADERS = [
  "Product Name",
  "Description",
  "SKU",
  "Retail Price",
  "Wholesale Price",
  "Weight",
  "Option 1 Name",
  "Option 1 Value",
  "Option 2 Name",
  "Option 2 Value",
  "Retail Stock Count",
  "Track Stock",
  "Status",
  "Image URL",
  "Is Retail",
  "Is Wholesale",
  "Minimum Wholesale Quantity",
  "Brand",
  "GTIN",
  "VAT Rate",
];

const COFFEE_EXAMPLE = [
  "Ethiopian Yirgacheffe",
  "Bright and fruity single origin",
  "Ethiopia",
  "Blueberry, Jasmine, Citrus",
  "ETH-YRG-250",
  "12.50",
  "",
  "250g",
  "Whole Bean",
  "50",
  "yes",
  "published",
  "",
  "yes",
  "no",
  "",
  "",
  "",
  "",
];

const COFFEE_EXAMPLE_2 = [
  "Ethiopian Yirgacheffe",
  "",
  "",
  "",
  "ETH-YRG-1KG",
  "42.00",
  "",
  "1kg",
  "Whole Bean",
  "20",
  "yes",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
];

const OTHER_EXAMPLE = [
  "Ceramic Dripper",
  "Handmade V60-style pour over dripper",
  "DRIP-001",
  "28.00",
  "22.00",
  "350g",
  "Colour",
  "White",
  "",
  "",
  "15",
  "yes",
  "published",
  "",
  "yes",
  "yes",
  "6",
  "",
  "",
  "",
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
  const category = searchParams.get("category") || "coffee";

  const headers = category === "other" ? OTHER_HEADERS : COFFEE_HEADERS;
  const examples =
    category === "other"
      ? [OTHER_EXAMPLE]
      : [COFFEE_EXAMPLE, COFFEE_EXAMPLE_2];

  const lines = [
    toCsvRow(headers),
    ...examples.map(toCsvRow),
  ];

  const csv = lines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="product-import-template-${category}.csv"`,
    },
  });
}
