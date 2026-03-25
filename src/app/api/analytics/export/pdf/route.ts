import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  renderToBuffer,
  StyleSheet,
} from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDateRange, type DatePreset } from "@/lib/analytics/types";
import { fetchSalesData } from "@/lib/analytics/sales";
import { fetchInventoryData } from "@/lib/analytics/inventory";
import { fetchCustomersData } from "@/lib/analytics/customers";
import { fetchProductionData } from "@/lib/analytics/production";

// ─── Helpers ────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `£${amount.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateRange(preset: DatePreset, from?: string, to?: string): string {
  switch (preset) {
    case "7d":
      return "Last 7 Days";
    case "30d":
      return "Last 30 Days";
    case "90d":
      return "Last 90 Days";
    case "year":
      return "Year to Date";
    case "all":
      return "All Time";
    case "custom":
      return `${from ? formatDate(from) : ""} - ${to ? formatDate(to) : ""}`;
    default:
      return "";
  }
}

// ─── Styles ─────────────────────────────────────────────────────────

const colors = {
  brand: "#0073c2",
  text: "#334155",
  textSecondary: "#64748b",
  border: "#e2e8f0",
  background: "#f8fafc",
  white: "#ffffff",
  green: "#16a34a",
  amber: "#f59e0b",
  red: "#dc2626",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.text,
    backgroundColor: colors.white,
  },
  // Header
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.brand,
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: colors.brand,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.text,
    marginBottom: 2,
  },
  meta: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  // Section
  section: {
    marginTop: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: colors.text,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  // KPIs
  kpiRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  kpiBox: {
    flex: 1,
    padding: 10,
    backgroundColor: colors.background,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kpiLabel: {
    fontSize: 8,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: colors.text,
  },
  // Table
  table: {
    marginTop: 8,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.background,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableCell: {
    fontSize: 9,
    color: colors.text,
  },
  // Column widths
  col1: { flex: 1 },
  col2: { width: 80, textAlign: "right" },
  col3: { width: 80, textAlign: "right" },
  col4: { width: 80, textAlign: "right" },
  colStatus: { width: 60 },
  // Status badges
  statusGreen: {
    color: colors.green,
  },
  statusAmber: {
    color: colors.amber,
  },
  statusRed: {
    color: colors.red,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: colors.textSecondary,
  },
});

// ─── PDF Document ───────────────────────────────────────────────────

interface AnalyticsReportProps {
  roasterName: string;
  dateRangeText: string;
  generatedAt: string;
  sections: {
    sales?: any;
    inventory?: any;
    customers?: any;
    production?: any;
  };
}

function AnalyticsDocument(props: AnalyticsReportProps) {
  const { roasterName, dateRangeText, generatedAt, sections } = props;

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },

      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.title }, roasterName),
        React.createElement(
          Text,
          { style: styles.subtitle },
          "Analytics Report"
        ),
        React.createElement(Text, { style: styles.meta }, dateRangeText),
        React.createElement(
          Text,
          { style: styles.meta },
          `Generated: ${generatedAt}`
        )
      ),

      // Sales Section
      sections.sales
        ? React.createElement(
            View,
            { style: styles.section },
            React.createElement(
              Text,
              { style: styles.sectionHeader },
              "Sales Performance"
            ),

            // KPIs
            React.createElement(
              View,
              { style: styles.kpiRow },
              React.createElement(
                View,
                { style: styles.kpiBox },
                React.createElement(
                  Text,
                  { style: styles.kpiLabel },
                  "Total Revenue"
                ),
                React.createElement(
                  Text,
                  { style: styles.kpiValue },
                  formatCurrency(sections.sales.totalRevenue)
                )
              ),
              React.createElement(
                View,
                { style: styles.kpiBox },
                React.createElement(
                  Text,
                  { style: styles.kpiLabel },
                  "Order Count"
                ),
                React.createElement(
                  Text,
                  { style: styles.kpiValue },
                  String(sections.sales.orderCount)
                )
              )
            ),
            React.createElement(
              View,
              { style: styles.kpiRow },
              React.createElement(
                View,
                { style: styles.kpiBox },
                React.createElement(Text, { style: styles.kpiLabel }, "AOV"),
                React.createElement(
                  Text,
                  { style: styles.kpiValue },
                  formatCurrency(sections.sales.aov)
                )
              ),
              React.createElement(
                View,
                { style: styles.kpiBox },
                React.createElement(
                  Text,
                  { style: styles.kpiLabel },
                  "Refund Rate"
                ),
                React.createElement(
                  Text,
                  { style: styles.kpiValue },
                  `${sections.sales.refundRate.toFixed(1)}%`
                )
              )
            ),

            // Revenue Over Time Table
            React.createElement(
              Text,
              { style: { ...styles.kpiLabel, marginTop: 12, marginBottom: 4 } },
              "Revenue Over Time"
            ),
            React.createElement(
              View,
              { style: styles.table },
              React.createElement(
                View,
                { style: styles.tableHeader },
                React.createElement(
                  Text,
                  { style: { ...styles.tableHeaderCell, ...styles.col1 } },
                  "Date"
                ),
                React.createElement(
                  Text,
                  { style: { ...styles.tableHeaderCell, ...styles.col2 } },
                  "Retail"
                ),
                React.createElement(
                  Text,
                  { style: { ...styles.tableHeaderCell, ...styles.col3 } },
                  "Wholesale"
                ),
                React.createElement(
                  Text,
                  { style: { ...styles.tableHeaderCell, ...styles.col4 } },
                  "Total"
                )
              ),
              ...sections.sales.revenueOverTime.slice(0, 20).map((row: any, i: number) =>
                React.createElement(
                  View,
                  { key: i, style: styles.tableRow },
                  React.createElement(
                    Text,
                    { style: { ...styles.tableCell, ...styles.col1 } },
                    formatDate(row.date)
                  ),
                  React.createElement(
                    Text,
                    { style: { ...styles.tableCell, ...styles.col2 } },
                    formatCurrency(row.retail)
                  ),
                  React.createElement(
                    Text,
                    { style: { ...styles.tableCell, ...styles.col3 } },
                    formatCurrency(row.wholesale)
                  ),
                  React.createElement(
                    Text,
                    { style: { ...styles.tableCell, ...styles.col4 } },
                    formatCurrency(row.total)
                  )
                )
              )
            )
          )
        : null,

      // Inventory Section
      sections.inventory
        ? React.createElement(
            View,
            { style: styles.section },
            React.createElement(
              Text,
              { style: styles.sectionHeader },
              "Inventory Management"
            ),

            // KPIs
            React.createElement(
              View,
              { style: styles.kpiRow },
              React.createElement(
                View,
                { style: styles.kpiBox },
                React.createElement(
                  Text,
                  { style: styles.kpiLabel },
                  "Waste Rate"
                ),
                React.createElement(
                  Text,
                  { style: styles.kpiValue },
                  `${sections.inventory.wasteRate.toFixed(1)}%`
                )
              ),
              React.createElement(
                View,
                { style: styles.kpiBox },
                React.createElement(
                  Text,
                  { style: styles.kpiLabel },
                  "Total Waste"
                ),
                React.createElement(
                  Text,
                  { style: styles.kpiValue },
                  `${sections.inventory.totalWaste.toFixed(1)} kg`
                )
              )
            ),

            // Stock Levels Table
            React.createElement(
              Text,
              { style: { ...styles.kpiLabel, marginTop: 12, marginBottom: 4 } },
              "Roasted Stock Levels"
            ),
            React.createElement(
              View,
              { style: styles.table },
              React.createElement(
                View,
                { style: styles.tableHeader },
                React.createElement(
                  Text,
                  { style: { ...styles.tableHeaderCell, ...styles.col1 } },
                  "Pool Name"
                ),
                React.createElement(
                  Text,
                  { style: { ...styles.tableHeaderCell, ...styles.col2 } },
                  "Current (kg)"
                ),
                React.createElement(
                  Text,
                  { style: { ...styles.tableHeaderCell, ...styles.col3 } },
                  "Threshold (kg)"
                ),
                React.createElement(
                  Text,
                  { style: { ...styles.tableHeaderCell, ...styles.colStatus } },
                  "Status"
                )
              ),
              ...sections.inventory.roastedStockLevels.slice(0, 15).map((row: any, i: number) =>
                React.createElement(
                  View,
                  { key: i, style: styles.tableRow },
                  React.createElement(
                    Text,
                    { style: { ...styles.tableCell, ...styles.col1 } },
                    row.name
                  ),
                  React.createElement(
                    Text,
                    { style: { ...styles.tableCell, ...styles.col2 } },
                    row.current_stock_kg.toFixed(1)
                  ),
                  React.createElement(
                    Text,
                    { style: { ...styles.tableCell, ...styles.col3 } },
                    row.low_stock_threshold_kg?.toFixed(1) || "—"
                  ),
                  React.createElement(
                    Text,
                    {
                      style: {
                        ...styles.tableCell,
                        ...styles.colStatus,
                        ...(row.status === "green"
                          ? styles.statusGreen
                          : row.status === "amber"
                          ? styles.statusAmber
                          : styles.statusRed),
                      },
                    },
                    row.status.toUpperCase()
                  )
                )
              )
            )
          )
        : null,

      // Customers Section
      sections.customers
        ? React.createElement(
            View,
            { style: styles.section },
            React.createElement(
              Text,
              { style: styles.sectionHeader },
              "Customer Insights"
            ),

            // KPIs
            React.createElement(
              View,
              { style: styles.kpiRow },
              React.createElement(
                View,
                { style: styles.kpiBox },
                React.createElement(
                  Text,
                  { style: styles.kpiLabel },
                  "Total Customers"
                ),
                React.createElement(
                  Text,
                  { style: styles.kpiValue },
                  String(sections.customers.totalCustomersInPeriod)
                )
              ),
              React.createElement(
                View,
                { style: styles.kpiBox },
                React.createElement(
                  Text,
                  { style: styles.kpiLabel },
                  "Repeat Customers"
                ),
                React.createElement(
                  Text,
                  { style: styles.kpiValue },
                  String(sections.customers.repeatCustomers)
                )
              )
            ),
            React.createElement(
              View,
              { style: styles.kpiRow },
              React.createElement(
                View,
                { style: styles.kpiBox },
                React.createElement(
                  Text,
                  { style: styles.kpiLabel },
                  "At-Risk Customers"
                ),
                React.createElement(
                  Text,
                  { style: styles.kpiValue },
                  String(sections.customers.atRiskCount)
                )
              ),
              React.createElement(View, { style: styles.kpiBox })
            ),

            // Top 10 Customers Table
            React.createElement(
              Text,
              { style: { ...styles.kpiLabel, marginTop: 12, marginBottom: 4 } },
              "Top 10 Customers by Spend"
            ),
            React.createElement(
              View,
              { style: styles.table },
              React.createElement(
                View,
                { style: styles.tableHeader },
                React.createElement(
                  Text,
                  { style: { ...styles.tableHeaderCell, flex: 2 } },
                  "Name"
                ),
                React.createElement(
                  Text,
                  { style: { ...styles.tableHeaderCell, flex: 2 } },
                  "Business"
                ),
                React.createElement(
                  Text,
                  { style: { ...styles.tableHeaderCell, width: 70, textAlign: "right" } },
                  "Spend"
                ),
                React.createElement(
                  Text,
                  { style: { ...styles.tableHeaderCell, width: 50, textAlign: "right" } },
                  "Orders"
                ),
                React.createElement(
                  Text,
                  { style: { ...styles.tableHeaderCell, width: 80, textAlign: "right" } },
                  "Last Activity"
                )
              ),
              ...sections.customers.topCustomers.map((row: any, i: number) =>
                React.createElement(
                  View,
                  { key: i, style: styles.tableRow },
                  React.createElement(
                    Text,
                    { style: { ...styles.tableCell, flex: 2 } },
                    `${row.first_name} ${row.last_name}`
                  ),
                  React.createElement(
                    Text,
                    { style: { ...styles.tableCell, flex: 2 } },
                    row.business_name || "—"
                  ),
                  React.createElement(
                    Text,
                    { style: { ...styles.tableCell, width: 70, textAlign: "right" } },
                    formatCurrency(row.total_spend)
                  ),
                  React.createElement(
                    Text,
                    { style: { ...styles.tableCell, width: 50, textAlign: "right" } },
                    String(row.order_count)
                  ),
                  React.createElement(
                    Text,
                    { style: { ...styles.tableCell, width: 80, textAlign: "right" } },
                    row.last_activity_at ? formatDate(row.last_activity_at) : "—"
                  )
                )
              )
            )
          )
        : null,

      // Production Section
      sections.production
        ? React.createElement(
            View,
            { style: styles.section },
            React.createElement(
              Text,
              { style: styles.sectionHeader },
              "Production Overview"
            ),

            // KPIs
            React.createElement(
              View,
              { style: styles.kpiRow },
              React.createElement(
                View,
                { style: styles.kpiBox },
                React.createElement(
                  Text,
                  { style: styles.kpiLabel },
                  "Total Roasts"
                ),
                React.createElement(
                  Text,
                  { style: styles.kpiValue },
                  String(sections.production.totalRoasts)
                )
              ),
              React.createElement(
                View,
                { style: styles.kpiBox },
                React.createElement(
                  Text,
                  { style: styles.kpiLabel },
                  "Total Kg Roasted"
                ),
                React.createElement(
                  Text,
                  { style: styles.kpiValue },
                  sections.production.totalKg.toFixed(1)
                )
              )
            ),
            React.createElement(
              View,
              { style: styles.kpiRow },
              React.createElement(
                View,
                { style: styles.kpiBox },
                React.createElement(
                  Text,
                  { style: styles.kpiLabel },
                  "Plans Completed"
                ),
                React.createElement(
                  Text,
                  { style: styles.kpiValue },
                  `${sections.production.plansCompleted}/${sections.production.plansTotal}`
                )
              ),
              React.createElement(View, { style: styles.kpiBox })
            ),

            // Top Beans Table
            React.createElement(
              Text,
              { style: { ...styles.kpiLabel, marginTop: 12, marginBottom: 4 } },
              "Top Beans by Volume"
            ),
            React.createElement(
              View,
              { style: styles.table },
              React.createElement(
                View,
                { style: styles.tableHeader },
                React.createElement(
                  Text,
                  { style: { ...styles.tableHeaderCell, ...styles.col1 } },
                  "Bean Name"
                ),
                React.createElement(
                  Text,
                  { style: { ...styles.tableHeaderCell, ...styles.col2 } },
                  "Volume (kg)"
                )
              ),
              ...sections.production.topBeans.map((row: any, i: number) =>
                React.createElement(
                  View,
                  { key: i, style: styles.tableRow },
                  React.createElement(
                    Text,
                    { style: { ...styles.tableCell, ...styles.col1 } },
                    row.name
                  ),
                  React.createElement(
                    Text,
                    { style: { ...styles.tableCell, ...styles.col2 } },
                    row.value.toFixed(1)
                  )
                )
              )
            )
          )
        : null,

      // Footer
      React.createElement(
        Text,
        { style: styles.footer },
        "Roastery Platform Analytics Report"
      )
    )
  );
}

// ─── API Route ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const user = await getCurrentUser();
    if (!user?.roaster?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roasterId = user.roaster.id;
    const roasterName = user.roaster.business_name || "Roastery";

    // Parse query params
    const { searchParams } = new URL(request.url);
    const sectionsParam = searchParams.get("sections") || "sales,inventory,customers,production";
    const rangePreset = (searchParams.get("range") || "30d") as DatePreset;
    const customFrom = searchParams.get("from") || undefined;
    const customTo = searchParams.get("to") || undefined;

    const requestedSections = sectionsParam.split(",");
    const dateRange = getDateRange(rangePreset, customFrom, customTo);
    const dateRangeText = formatDateRange(rangePreset, customFrom, customTo);
    const generatedAt = new Date().toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Fetch data for requested sections
    const sections: any = {};

    if (requestedSections.includes("sales")) {
      sections.sales = await fetchSalesData(roasterId, dateRange);
    }

    if (requestedSections.includes("inventory")) {
      sections.inventory = await fetchInventoryData(roasterId, dateRange);
    }

    if (requestedSections.includes("customers")) {
      sections.customers = await fetchCustomersData(roasterId, dateRange);
    }

    if (requestedSections.includes("production")) {
      sections.production = await fetchProductionData(roasterId, dateRange);
    }

    // Generate PDF
    const doc = AnalyticsDocument({
      roasterName,
      dateRangeText,
      generatedAt,
      sections,
    });

    const rawBuffer = await renderToBuffer(doc as React.ReactElement);
    const pdfBuffer = Buffer.from(rawBuffer);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="analytics-report-${rangePreset}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF export error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
