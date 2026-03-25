import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDateRange, type DatePreset } from "@/lib/analytics/types";
import { fetchSalesData } from "@/lib/analytics/sales";
import { fetchInventoryData } from "@/lib/analytics/inventory";
import { fetchCustomersData } from "@/lib/analytics/customers";
import { fetchProductionData } from "@/lib/analytics/production";

function escapeCsv(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roasterId = user.roaster?.id;
    if (!roasterId) {
      return NextResponse.json(
        { error: "Roaster profile required" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const sectionsParam = searchParams.get("sections");
    const range = (searchParams.get("range") || "30d") as DatePreset;
    const customFrom = searchParams.get("from") || undefined;
    const customTo = searchParams.get("to") || undefined;

    if (!sectionsParam) {
      return NextResponse.json(
        { error: "Missing sections parameter" },
        { status: 400 }
      );
    }

    const requestedSections = sectionsParam.split(",");
    const dateRange = getDateRange(range, customFrom, customTo);

    const result: {
      sales?: string;
      inventory?: string;
      customers?: string;
      production?: string;
    } = {};

    for (const section of requestedSections) {
      switch (section) {
        case "sales": {
          const data = await fetchSalesData(roasterId, dateRange);

          const headers = ["Date", "Retail Revenue", "Wholesale Revenue", "Total Revenue"];
          const rows = [headers.join(",")];

          for (const day of data.revenueOverTime) {
            rows.push(
              [
                escapeCsv(day.date),
                escapeCsv(day.retail.toFixed(2)),
                escapeCsv(day.wholesale.toFixed(2)),
                escapeCsv(day.total.toFixed(2)),
              ].join(",")
            );
          }

          result.sales = rows.join("\n");
          break;
        }

        case "inventory": {
          const data = await fetchInventoryData(roasterId, dateRange);

          // Roasted stock levels
          const stockHeaders = ["Pool Name", "Current Stock Kg", "Threshold Kg", "Status"];
          const stockRows = [stockHeaders.join(",")];

          for (const s of data.roastedStockLevels) {
            stockRows.push(
              [
                escapeCsv(s.name),
                escapeCsv(s.current_stock_kg.toFixed(2)),
                escapeCsv(s.low_stock_threshold_kg?.toFixed(2) ?? ""),
                escapeCsv(s.status),
              ].join(",")
            );
          }

          // Green bean levels
          stockRows.push("", "Green Bean Stock Levels");
          stockRows.push(stockHeaders.join(","));
          for (const s of data.greenBeanLevels) {
            stockRows.push(
              [
                escapeCsv(s.name),
                escapeCsv(s.current_stock_kg.toFixed(2)),
                escapeCsv(s.low_stock_threshold_kg?.toFixed(2) ?? ""),
                escapeCsv(s.status),
              ].join(",")
            );
          }

          // Stock movements
          const movementsHeaders = ["Date", "Roast Addition", "Order Deduction", "Adjustment", "Waste"];
          stockRows.push("", "Stock Movements");
          stockRows.push(movementsHeaders.join(","));

          for (const m of data.movementsOverTime) {
            stockRows.push(
              [
                escapeCsv(m.date),
                escapeCsv(m.roast_addition.toFixed(2)),
                escapeCsv(m.order_deduction.toFixed(2)),
                escapeCsv(m.adjustment.toFixed(2)),
                escapeCsv(m.waste.toFixed(2)),
              ].join(",")
            );
          }

          result.inventory = stockRows.join("\n");
          break;
        }

        case "customers": {
          const data = await fetchCustomersData(roasterId, dateRange);

          const headers = ["Name", "Business", "Total Spend", "Orders", "Last Activity", "Tier"];
          const rows = [headers.join(",")];

          for (const c of data.topCustomers) {
            const name = `${c.first_name} ${c.last_name}`.trim() || c.business_name || "";
            rows.push(
              [
                escapeCsv(name),
                escapeCsv(c.business_name || ""),
                escapeCsv(c.total_spend.toFixed(2)),
                escapeCsv(c.order_count),
                escapeCsv(c.last_activity_at || ""),
                escapeCsv(c.priceTier || ""),
              ].join(",")
            );
          }

          result.customers = rows.join("\n");
          break;
        }

        case "production": {
          const data = await fetchProductionData(roasterId, dateRange);

          // Daily roasts + kg
          const dailyHeaders = ["Date", "Roasts Count", "Kg Roasted"];
          const dailyRows = [dailyHeaders.join(",")];

          // Merge roastsOverTime and kgOverTime into one table by date
          const dateMap: Record<string, { roasts: number; kg: number }> = {};
          for (const d of data.roastsOverTime) {
            if (!dateMap[d.date]) dateMap[d.date] = { roasts: 0, kg: 0 };
            dateMap[d.date].roasts = d.value;
          }
          for (const d of data.kgOverTime) {
            if (!dateMap[d.date]) dateMap[d.date] = { roasts: 0, kg: 0 };
            dateMap[d.date].kg = d.value;
          }

          const sortedDates = Object.keys(dateMap).sort();
          for (const date of sortedDates) {
            dailyRows.push(
              [
                escapeCsv(date),
                escapeCsv(dateMap[date].roasts),
                escapeCsv(dateMap[date].kg.toFixed(2)),
              ].join(",")
            );
          }

          // Top beans
          dailyRows.push("", "Top Beans by Volume");
          dailyRows.push(["Bean Name", "Volume Kg"].join(","));
          for (const bean of data.topBeans) {
            dailyRows.push(
              [escapeCsv(bean.name), escapeCsv(bean.value.toFixed(2))].join(",")
            );
          }

          result.production = dailyRows.join("\n");
          break;
        }
      }
    }

    return NextResponse.json({ sections: result });
  } catch (error) {
    console.error("CSV export error:", error);
    return NextResponse.json(
      { error: "Failed to export CSV data" },
      { status: 500 }
    );
  }
}
