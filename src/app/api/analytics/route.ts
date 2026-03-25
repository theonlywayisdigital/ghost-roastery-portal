import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDateRange, type DatePreset } from "@/lib/analytics/types";
import { fetchOverviewData } from "@/lib/analytics/overview";
import { fetchSalesData } from "@/lib/analytics/sales";
import { fetchInventoryData } from "@/lib/analytics/inventory";
import { fetchCustomersData } from "@/lib/analytics/customers";
import { fetchProductionData } from "@/lib/analytics/production";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roasterId = user.roaster.id;
  const url = new URL(req.url);
  const section = url.searchParams.get("section") || "overview";
  const preset = (url.searchParams.get("range") as DatePreset) || "30d";
  const customFrom = url.searchParams.get("from") || undefined;
  const customTo = url.searchParams.get("to") || undefined;
  const range = getDateRange(preset, customFrom, customTo);

  try {
    let data: any;
    switch (section) {
      case "overview":
        data = await fetchOverviewData(roasterId, range);
        break;
      case "sales":
        data = await fetchSalesData(roasterId, range);
        break;
      case "inventory":
        data = await fetchInventoryData(roasterId, range);
        break;
      case "customers":
        data = await fetchCustomersData(roasterId, range);
        break;
      case "production":
        data = await fetchProductionData(roasterId, range);
        break;
      default:
        return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error(`Analytics ${section} error:`, err);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
