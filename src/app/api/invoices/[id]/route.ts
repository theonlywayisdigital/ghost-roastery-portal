import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  try {
    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Access control
    const isAdmin = user.roles.includes("admin");
    const isOwnRoaster =
      user.roles.includes("roaster") &&
      user.roaster?.id &&
      invoice.roaster_id === user.roaster.id;
    const isBuyer = invoice.buyer_id === user.id;

    if (!isAdmin && !isOwnRoaster && !isBuyer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch line items
    const { data: lineItems } = await supabase
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", id)
      .order("sort_order", { ascending: true });

    // Fetch payments
    const { data: payments } = await supabase
      .from("invoice_payments")
      .select("*")
      .eq("invoice_id", id)
      .order("paid_at", { ascending: false });

    // Enrich payment recorded_by names
    const recorderIds = Array.from(
      new Set(
        (payments || [])
          .map((p) => p.recorded_by)
          .filter(Boolean) as string[]
      )
    );

    let recorderMap = new Map<string, string>();
    if (recorderIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, people_id, people(first_name, last_name)")
        .in("id", recorderIds);

      recorderMap = new Map(
        (profiles || []).map((p) => {
          const peopleRaw = p.people as unknown;
          const person = (
            Array.isArray(peopleRaw) ? peopleRaw[0] : peopleRaw
          ) as { first_name: string; last_name: string } | null;
          return [
            p.id,
            person
              ? `${person.first_name} ${person.last_name}`.trim()
              : "Unknown",
          ];
        })
      );
    }

    const enrichedPayments = (payments || []).map((p) => ({
      ...p,
      recorded_by_name: p.recorded_by
        ? recorderMap.get(p.recorded_by) || "Unknown"
        : null,
    }));

    // Fetch customer name if present
    let customerName: string | null = null;
    let customerEmail: string | null = null;
    if (invoice.customer_id) {
      const { data: person } = await supabase
        .from("people")
        .select("first_name, last_name, email")
        .eq("id", invoice.customer_id)
        .single();

      if (person) {
        customerName = `${person.first_name} ${person.last_name}`.trim();
        customerEmail = person.email;
      }
    }

    // Fetch business name if present
    let businessName: string | null = null;
    if (invoice.business_id) {
      const { data: business } = await supabase
        .from("businesses")
        .select("name")
        .eq("id", invoice.business_id)
        .single();

      if (business) {
        businessName = business.name;
      }
    }

    // Fetch roaster name if present
    let roasterName: string | null = null;
    if (invoice.roaster_id) {
      const { data: roaster } = await supabase
        .from("partner_roasters")
        .select("business_name")
        .eq("id", invoice.roaster_id)
        .single();

      if (roaster) {
        roasterName = roaster.business_name;
      }
    }

    return NextResponse.json({
      ...invoice,
      customer_name: customerName,
      customer_email: customerEmail,
      business_name: businessName,
      roaster_name: roasterName,
      structured_line_items: lineItems || [],
      payments: enrichedPayments,
    });
  } catch (error) {
    console.error("Get invoice error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = user.roles.includes("admin");
  const isRoaster = user.roles.includes("roaster");

  if (!isAdmin && !isRoaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  try {
    // Fetch current invoice
    const { data: invoice, error: fetchError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Access control: roaster can only edit their own invoices
    if (
      isRoaster &&
      !isAdmin &&
      invoice.roaster_id !== user.roaster?.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow editing draft invoices
    if (invoice.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft invoices can be edited" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      customer_id,
      business_id,
      order_ids,
      line_items,
      notes,
      internal_notes,
      payment_method,
      due_days,
      tax_rate,
    } = body as {
      customer_id?: string;
      business_id?: string;
      order_ids?: string[];
      line_items?: { description: string; quantity: number; unit_price: number }[];
      notes?: string;
      internal_notes?: string;
      payment_method?: string;
      due_days?: number;
      tax_rate?: number;
    };

    // Build invoice updates
    const updates: Record<string, unknown> = {};

    if (customer_id !== undefined) {
      updates.customer_id = customer_id || null;
      updates.buyer_id = customer_id || null;
    }
    if (business_id !== undefined) updates.business_id = business_id || null;
    if (order_ids !== undefined) updates.order_ids = order_ids || null;
    if (notes !== undefined) updates.notes = notes || null;
    if (internal_notes !== undefined) updates.internal_notes = internal_notes || null;
    if (payment_method !== undefined) updates.payment_method = payment_method;

    // Recalculate totals if line_items are provided
    if (line_items && Array.isArray(line_items) && line_items.length > 0) {
      // Delete existing line items
      const { error: deleteError } = await supabase
        .from("invoice_line_items")
        .delete()
        .eq("invoice_id", id);

      if (deleteError) {
        console.error("Error deleting line items:", deleteError);
        return NextResponse.json(
          { error: "Failed to update line items" },
          { status: 500 }
        );
      }

      // Calculate new totals
      let subtotal = 0;
      const processedItems = line_items.map((item, index) => {
        const lineTotal =
          Math.round(item.quantity * item.unit_price * 100) / 100;
        subtotal += lineTotal;
        return {
          invoice_id: id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: lineTotal,
          sort_order: index,
        };
      });

      subtotal = Math.round(subtotal * 100) / 100;
      const effectiveTaxRate =
        tax_rate !== undefined ? tax_rate : invoice.tax_rate;
      const taxAmount =
        Math.round(subtotal * (effectiveTaxRate / 100) * 100) / 100;
      const total = Math.round((subtotal + taxAmount) * 100) / 100;

      updates.subtotal = subtotal;
      updates.tax_amount = taxAmount;
      updates.total = total;
      updates.amount_due = total - (invoice.amount_paid || 0);

      if (tax_rate !== undefined) {
        updates.tax_rate = tax_rate;
      }

      // Insert new line items
      const { error: insertError } = await supabase
        .from("invoice_line_items")
        .insert(processedItems);

      if (insertError) {
        console.error("Error inserting line items:", insertError);
        return NextResponse.json(
          { error: "Failed to update line items" },
          { status: 500 }
        );
      }
    } else if (tax_rate !== undefined && tax_rate !== invoice.tax_rate) {
      // Recalculate tax even if line_items not changed
      const taxAmount =
        Math.round(invoice.subtotal * (tax_rate / 100) * 100) / 100;
      const total =
        Math.round((invoice.subtotal + taxAmount) * 100) / 100;

      updates.tax_rate = tax_rate;
      updates.tax_amount = taxAmount;
      updates.total = total;
      updates.amount_due = total - (invoice.amount_paid || 0);
    }

    // Update due_days and payment_due_date
    if (due_days !== undefined) {
      updates.due_days = due_days;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + due_days);
      updates.payment_due_date = dueDate.toISOString().split("T")[0];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No changes provided" },
        { status: 400 }
      );
    }

    const { data: updatedInvoice, error: updateError } = await supabase
      .from("invoices")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating invoice:", updateError);
      return NextResponse.json(
        { error: "Failed to update invoice" },
        { status: 500 }
      );
    }

    // Fetch updated line items
    const { data: updatedLineItems } = await supabase
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", id)
      .order("sort_order", { ascending: true });

    return NextResponse.json({
      ...updatedInvoice,
      structured_line_items: updatedLineItems || [],
    });
  } catch (error) {
    console.error("Update invoice error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
