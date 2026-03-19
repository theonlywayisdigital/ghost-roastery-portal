import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import {
  getInvoiceOwner,
  generateInvoiceNumber,
  generateAccessToken,
} from "@/lib/invoice-utils";
import { checkFeature } from "@/lib/feature-gates";
import { dispatchWebhook } from "@/lib/webhooks";
import { syncToXero, pushInvoiceToXero } from "@/lib/xero";
import { syncToSage, pushInvoiceToSage } from "@/lib/sage";
import { syncToQuickBooks, pushInvoiceToQuickBooks } from "@/lib/quickbooks";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owner = getInvoiceOwner(user);
  if (!owner) {
    return NextResponse.json(
      { error: "You do not have permission to create invoices" },
      { status: 403 }
    );
  }

  try {
    // Check invoices feature gate
    if (owner.roaster_id) {
      const featureCheck = await checkFeature(owner.roaster_id, "invoices");
      if (!featureCheck.allowed) {
        return NextResponse.json(
          { error: featureCheck.message, upgrade_required: true },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const {
      customer_id,
      business_id,
      wholesale_access_id,
      order_ids,
      line_items,
      notes,
      internal_notes,
      payment_method,
      due_days = 30,
      tax_rate = 0,
    } = body as {
      customer_id?: string;
      business_id?: string;
      wholesale_access_id?: string;
      order_ids?: string[];
      line_items: { description: string; quantity: number; unit_price: number }[];
      notes?: string;
      internal_notes?: string;
      payment_method?: string;
      due_days?: number;
      tax_rate?: number;
    };

    if (!line_items || !Array.isArray(line_items) || line_items.length === 0) {
      return NextResponse.json(
        { error: "At least one line item is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Generate invoice number and access token
    const invoiceNumber = await generateInvoiceNumber(
      supabase,
      owner.owner_type,
      owner.roaster_id
    );
    const accessToken = generateAccessToken();

    // Calculate totals from line_items
    let subtotal = 0;
    const processedItems = line_items.map((item, index) => {
      const lineTotal = Math.round(item.quantity * item.unit_price * 100) / 100;
      subtotal += lineTotal;
      return {
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: lineTotal,
        sort_order: index,
      };
    });

    subtotal = Math.round(subtotal * 100) / 100;
    const taxAmount = Math.round(subtotal * (tax_rate / 100) * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;
    const amountDue = total;

    // Calculate payment_due_date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + due_days);
    const paymentDueDate = dueDate.toISOString().split("T")[0];

    // Insert invoice row
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        owner_type: owner.owner_type,
        roaster_id: owner.roaster_id,
        buyer_id: customer_id || null,
        customer_id: customer_id || null,
        business_id: business_id || null,
        wholesale_access_id: wholesale_access_id || null,
        order_ids: order_ids || null,
        subtotal,
        discount_amount: 0,
        tax_rate,
        tax_amount: taxAmount,
        total,
        amount_paid: 0,
        amount_due: amountDue,
        currency: "GBP",
        payment_method: payment_method || "bank_transfer",
        payment_status: "unpaid",
        status: "draft",
        notes: notes || null,
        internal_notes: internal_notes || null,
        due_days,
        payment_due_date: paymentDueDate,
        invoice_access_token: accessToken,
        platform_fee_percent: 0,
        platform_fee_amount: 0,
      })
      .select()
      .single();

    if (invoiceError) {
      console.error("Error creating invoice:", invoiceError);
      return NextResponse.json(
        { error: "Failed to create invoice" },
        { status: 500 }
      );
    }

    // Insert invoice_line_items rows
    const lineItemsToInsert = processedItems.map((item) => ({
      invoice_id: invoice.id,
      ...item,
    }));

    const { error: lineItemsError } = await supabase
      .from("invoice_line_items")
      .insert(lineItemsToInsert);

    if (lineItemsError) {
      console.error("Error creating line items:", lineItemsError);
      // Clean up the invoice if line items fail
      await supabase.from("invoices").delete().eq("id", invoice.id);
      return NextResponse.json(
        { error: "Failed to create invoice line items" },
        { status: 500 }
      );
    }

    // Link invoice back to wholesale orders if order_ids provided
    if (order_ids && order_ids.length > 0) {
      for (const oid of order_ids) {
        await supabase
          .from("orders")
          .update({ invoice_id: invoice.id })
          .eq("id", oid);
      }
    }

    // Dispatch webhook
    if (owner.roaster_id) {
      dispatchWebhook(owner.roaster_id, "invoice.created", {
        invoice: {
          ...invoice,
          line_items: lineItemsToInsert,
        },
      });

      // Fetch customer and business info once for both Xero and Sage
      const roasterId = owner.roaster_id;

      let customerName = "Customer";
      let customerEmail: string | null = null;
      let customerBusinessName: string | null = null;
      let bizData: {
        name?: string;
        vat_number?: string | null;
        address_line_1?: string | null;
        address_line_2?: string | null;
        city?: string | null;
        postcode?: string | null;
        country?: string | null;
        email?: string | null;
      } | null = null;

      if (customer_id) {
        const { data: person } = await supabase
          .from("people")
          .select("first_name, last_name, email")
          .eq("id", customer_id)
          .single();
        if (person) {
          customerName = `${person.first_name} ${person.last_name}`.trim();
          customerEmail = person.email;
        }
      }

      if (business_id) {
        const { data: biz } = await supabase
          .from("businesses")
          .select("name, email, vat_number, address_line_1, address_line_2, city, postcode, country")
          .eq("id", business_id)
          .single();
        if (biz) {
          customerBusinessName = biz.name;
          if (!customerEmail && biz.email) customerEmail = biz.email;
          bizData = biz;
        }
      }

      const invoicePayload = {
        invoice_number: invoice.invoice_number,
        subtotal: invoice.subtotal,
        tax_rate: invoice.tax_rate,
        tax_amount: invoice.tax_amount,
        total: invoice.total,
        currency: invoice.currency,
        payment_due_date: invoice.payment_due_date,
        notes: invoice.notes,
        status: invoice.status,
      };

      const lineItemsPayload = lineItemsToInsert.map((item: { description: string; quantity: number; unit_price: number }) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }));

      const customerPayload = {
        name: customerName,
        email: customerEmail,
        business_name: customerBusinessName,
      };

      // Sync to Xero
      syncToXero(roasterId, async () => {
        await pushInvoiceToXero(
          roasterId,
          invoicePayload,
          lineItemsPayload,
          customerPayload,
          bizData
        );
      });

      // Sync to Sage
      syncToSage(roasterId, async () => {
        await pushInvoiceToSage(
          roasterId,
          invoicePayload,
          lineItemsPayload,
          customerPayload,
          bizData
        );
      });

      // Sync to QuickBooks
      syncToQuickBooks(roasterId, async () => {
        await pushInvoiceToQuickBooks(
          roasterId,
          invoicePayload,
          lineItemsPayload,
          customerPayload,
          bizData
        );
      });
    }

    return NextResponse.json(
      { ...invoice, structured_line_items: lineItemsToInsert },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create invoice error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = user.roles.includes("admin");
  const isRoaster = user.roles.includes("roaster");

  if (!isAdmin && !isRoaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const page = parseInt(params.get("page") || "1");
  const pageSize = parseInt(params.get("pageSize") || "25");
  const status = params.get("status") || "";
  const ownerTypeFilter = params.get("owner_type") || "";
  const dateFrom = params.get("dateFrom") || "";
  const dateTo = params.get("dateTo") || "";
  const search = params.get("search") || "";
  const sortKey = params.get("sortKey") || "created_at";
  const sortDir = params.get("sortDir") || "desc";
  const includeStats = params.get("includeStats") === "true";

  const supabase = createServerClient();

  try {
    let query = supabase
      .from("invoices")
      .select("*", { count: "exact" });

    // Access control: roasters only see their own invoices
    if (isRoaster && !isAdmin) {
      if (!user.roaster?.id) {
        return NextResponse.json({ data: [], total: 0, page, pageSize });
      }
      query = query.eq("roaster_id", user.roaster.id);
    }

    // Filters
    if (status) {
      query = query.eq("status", status);
    }
    if (ownerTypeFilter && isAdmin) {
      query = query.eq("owner_type", ownerTypeFilter);
    }
    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }
    if (dateTo) {
      query = query.lte("created_at", `${dateTo}T23:59:59`);
    }
    if (search) {
      query = query.or(
        `invoice_number.ilike.%${search}%,notes.ilike.%${search}%`
      );
    }

    // Sorting
    const sortColumn: Record<string, string> = {
      invoice_number: "invoice_number",
      total: "total",
      status: "status",
      payment_due_date: "payment_due_date",
      created_at: "created_at",
    };
    const orderBy = sortColumn[sortKey] || "created_at";
    query = query.order(orderBy, { ascending: sortDir === "asc" });

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: invoices, count, error } = await query;

    if (error) {
      console.error("Error fetching invoices:", error);
      return NextResponse.json(
        { error: "Failed to fetch invoices" },
        { status: 500 }
      );
    }

    // Join customer names and business names
    const customerIds = Array.from(
      new Set(
        (invoices || [])
          .map((inv) => inv.customer_id)
          .filter(Boolean) as string[]
      )
    );
    const businessIds = Array.from(
      new Set(
        (invoices || [])
          .map((inv) => inv.business_id)
          .filter(Boolean) as string[]
      )
    );

    // Fetch customer names from people table
    let customerMap = new Map<string, string>();
    if (customerIds.length > 0) {
      const { data: people } = await supabase
        .from("people")
        .select("id, first_name, last_name")
        .in("id", customerIds);

      customerMap = new Map(
        (people || []).map((p) => [
          p.id,
          `${p.first_name} ${p.last_name}`.trim(),
        ])
      );
    }

    // Fetch business names
    let businessMap = new Map<string, string>();
    if (businessIds.length > 0) {
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id, name")
        .in("id", businessIds);

      businessMap = new Map(
        (businesses || []).map((b) => [b.id, b.name])
      );
    }

    // Enrich invoices with joined names
    const enrichedInvoices = (invoices || []).map((inv) => ({
      ...inv,
      customer_name: inv.customer_id
        ? customerMap.get(inv.customer_id) || null
        : null,
      business_name: inv.business_id
        ? businessMap.get(inv.business_id) || null
        : null,
    }));

    // Optionally compute stats from full dataset (not just current page)
    let stats = undefined;
    if (includeStats) {
      let statsQuery = supabase
        .from("invoices")
        .select("status, total");

      if (isRoaster && !isAdmin && user.roaster?.id) {
        statsQuery = statsQuery.eq("roaster_id", user.roaster.id);
      }
      if (ownerTypeFilter && isAdmin) {
        statsQuery = statsQuery.eq("owner_type", ownerTypeFilter);
      }

      const { data: allInvoices } = await statsQuery;
      const all = allInvoices || [];
      stats = {
        total: all.length,
        totalValue: all.reduce((sum, i) => sum + Number(i.total || 0), 0),
        unpaid: all.filter(
          (i) => i.status === "sent" || i.status === "viewed" || i.status === "overdue"
        ).length,
        overdue: all.filter((i) => i.status === "overdue").length,
        paid: all.filter((i) => i.status === "paid").length,
        draft: all.filter((i) => i.status === "draft").length,
      };
    }

    return NextResponse.json({
      data: enrichedInvoices,
      total: count || 0,
      page,
      pageSize,
      stats,
    });
  } catch (error) {
    console.error("List invoices error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
