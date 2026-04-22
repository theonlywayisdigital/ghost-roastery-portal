import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { headers } from "next/headers";

// ── Types ──

interface PlannedAction {
  id: string;
  domain: string;
  action: string;
  label: string;
  type: "CREATE" | "UPDATE" | "DELETE" | "READ";
  destructive: boolean;
  endpoint: string;
  method: string;
  body: Record<string, unknown>;
  dependsOn: string[];
  conflictsWith: string[];
  diff: Array<{ field: string; from: unknown; to: unknown }>;
}

type ActionResult = { success: boolean; error?: string; data?: unknown; id?: string };

// ── Extract entity ID from endpoint ──

function extractEntityId(endpoint: string): string | null {
  const match = endpoint.match(/([a-f0-9-]{36})/);
  return match ? match[1] : null;
}

// ── ID substitution for dependency chaining ──
// Gemini uses action IDs as placeholders for records that don't exist yet.
// After a CREATE completes, we register its real DB ID and substitute it
// into all dependent action bodies and endpoints before execution.

function substituteIds(
  obj: Record<string, unknown>,
  idRegistry: Map<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string" && idRegistry.has(value)) {
      result[key] = idRegistry.get(value)!;
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (typeof item === "string" && idRegistry.has(item)) {
          return idRegistry.get(item)!;
        }
        if (item !== null && typeof item === "object" && !Array.isArray(item)) {
          return substituteIds(item as Record<string, unknown>, idRegistry);
        }
        return item;
      });
    } else if (value !== null && typeof value === "object") {
      result[key] = substituteIds(value as Record<string, unknown>, idRegistry);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function substituteEndpoint(endpoint: string, idRegistry: Map<string, string>): string {
  let result = endpoint;
  for (const [placeholder, realId] of idRegistry) {
    result = result.replaceAll(placeholder, realId);
  }
  return result;
}

// ── Direct Supabase execution layer ──
// Replaces internal HTTP fetch calls with direct DB operations.
// Complex actions (emails, Stripe, webhooks) fall back to internal fetch.

async function executeDirectly(
  action: PlannedAction,
  supabase: ReturnType<typeof createServerClient>,
  roasterId: string,
  userId: string
): Promise<ActionResult> {
  const entityId = extractEntityId(action.endpoint);
  const body = action.body || {};

  try {
    switch (action.domain) {
      // ─── Products ───
      case "products": {
        if (action.type === "CREATE") {
          const { data, error } = await supabase
            .from("products")
            .insert({ ...body, roaster_id: roasterId })
            .select("id, name")
            .single();
          if (error) return { success: false, error: error.message };
          return { success: true, id: data.id, data };
        }
        if (action.type === "UPDATE") {
          if (!entityId) return { success: false, error: "No product ID in endpoint" };
          const { data, error } = await supabase
            .from("products")
            .update(body)
            .eq("id", entityId)
            .eq("roaster_id", roasterId)
            .select("id, name")
            .single();
          if (error) return { success: false, error: error.message };
          if (!data) return { success: false, error: "Product not found or not owned" };
          return { success: true, data };
        }
        if (action.type === "DELETE") {
          if (!entityId) return { success: false, error: "No product ID in endpoint" };
          const { error } = await supabase
            .from("products")
            .delete()
            .eq("id", entityId)
            .eq("roaster_id", roasterId);
          if (error) return { success: false, error: error.message };
          return { success: true };
        }
        return { success: false, error: `Unsupported product action: ${action.action}` };
      }

      // ─── Contacts ───
      case "contacts": {
        // Notes sub-action
        if (action.endpoint.includes("/notes")) {
          if (!entityId) return { success: false, error: "No contact ID in endpoint" };
          // Verify ownership
          const { data: contact } = await supabase
            .from("contacts")
            .select("id")
            .eq("id", entityId)
            .eq("roaster_id", roasterId)
            .maybeSingle();
          if (!contact) return { success: false, error: "Contact not found or not owned" };
          const { data, error } = await supabase
            .from("contact_notes")
            .insert({
              contact_id: entityId,
              content: body.content as string,
              author_id: userId,
            })
            .select("id")
            .single();
          if (error) return { success: false, error: error.message };
          return { success: true, data };
        }

        // Activity sub-action
        if (action.endpoint.includes("/activity")) {
          if (!entityId) return { success: false, error: "No contact ID in endpoint" };
          const { data: contact } = await supabase
            .from("contacts")
            .select("id")
            .eq("id", entityId)
            .eq("roaster_id", roasterId)
            .maybeSingle();
          if (!contact) return { success: false, error: "Contact not found or not owned" };
          const { data, error } = await supabase
            .from("contact_activity")
            .insert({
              contact_id: entityId,
              activity_type: body.activity_type as string,
              description: body.description as string,
              performed_by: userId,
            })
            .select("id")
            .single();
          if (error) return { success: false, error: error.message };
          return { success: true, data };
        }

        if (action.type === "CREATE") {
          const { data, error } = await supabase
            .from("contacts")
            .insert({ ...body, roaster_id: roasterId })
            .select("id, first_name, last_name")
            .single();
          if (error) return { success: false, error: error.message };
          return { success: true, id: data.id, data };
        }
        if (action.type === "UPDATE") {
          if (!entityId) return { success: false, error: "No contact ID in endpoint" };
          const { data, error } = await supabase
            .from("contacts")
            .update(body)
            .eq("id", entityId)
            .eq("roaster_id", roasterId)
            .select("id, first_name, last_name")
            .single();
          if (error) return { success: false, error: error.message };
          if (!data) return { success: false, error: "Contact not found or not owned" };
          return { success: true, data };
        }
        if (action.type === "DELETE") {
          // Soft delete — archive
          if (!entityId) return { success: false, error: "No contact ID in endpoint" };
          const { data, error } = await supabase
            .from("contacts")
            .update({ status: "archived" })
            .eq("id", entityId)
            .eq("roaster_id", roasterId)
            .select("id")
            .single();
          if (error) return { success: false, error: error.message };
          if (!data) return { success: false, error: "Contact not found or not owned" };
          return { success: true, data };
        }
        return { success: false, error: `Unsupported contact action: ${action.action}` };
      }

      // ─── Orders ───
      case "orders": {
        // Order status update
        if (action.endpoint.includes("/status")) {
          if (!entityId) return { success: false, error: "No order ID in endpoint" };
          const updateFields: Record<string, unknown> = {};
          if (body.status) updateFields.status = body.status;
          if (body.trackingNumber) updateFields.tracking_number = body.trackingNumber;
          if (body.trackingCarrier) updateFields.tracking_carrier = body.trackingCarrier;
          // Set timestamp for status transitions
          const status = body.status as string;
          const now = new Date().toISOString();
          if (status === "confirmed") updateFields.confirmed_at = now;
          if (status === "dispatched") updateFields.dispatched_at = now;
          if (status === "delivered") updateFields.delivered_at = now;
          if (status === "processing") updateFields.processing_started_at = now;

          const { data, error } = await supabase
            .from("orders")
            .update(updateFields)
            .eq("id", entityId)
            .eq("roaster_id", roasterId)
            .select("id, status")
            .single();
          if (error) return { success: false, error: error.message };
          if (!data) return { success: false, error: "Order not found or not owned" };

          // Log activity
          await supabase.from("order_activity_log").insert({
            order_id: entityId,
            order_type: "wholesale",
            action: "status_change",
            description: `Status changed to ${status} by Beans AI`,
            actor_id: userId,
            actor_name: "Beans AI",
          }).then(() => {});

          return { success: true, data };
        }

        // Order activity/note
        if (action.endpoint.includes("/activity")) {
          if (!entityId) return { success: false, error: "No order ID in endpoint" };
          // Verify ownership
          const { data: order } = await supabase
            .from("orders")
            .select("id, order_channel")
            .eq("id", entityId)
            .eq("roaster_id", roasterId)
            .maybeSingle();
          if (!order) return { success: false, error: "Order not found or not owned" };

          const { data, error } = await supabase
            .from("order_activity_log")
            .insert({
              order_id: entityId,
              order_type: order.order_channel || "wholesale",
              action: "note",
              description: body.description as string,
              actor_id: userId,
              actor_name: "Beans AI",
            })
            .select("id")
            .single();
          if (error) return { success: false, error: error.message };
          return { success: true, data };
        }

        // Mark paid
        if (action.endpoint.includes("/mark-paid")) {
          if (!entityId) return { success: false, error: "No order ID in endpoint" };
          const { data, error } = await supabase
            .from("orders")
            .update({
              payment_status: "paid",
              payment_method: body.paymentMethod as string || "other",
            })
            .eq("id", entityId)
            .eq("roaster_id", roasterId)
            .select("id")
            .single();
          if (error) return { success: false, error: error.message };
          if (!data) return { success: false, error: "Order not found or not owned" };
          return { success: true, data };
        }

        // create-manual and cancel are complex (stock, email, refunds) — use fallback
        return NEEDS_FALLBACK;
      }

      // ─── Invoices ───
      case "invoices": {
        if (action.type === "CREATE") {
          const { data, error } = await supabase
            .from("invoices")
            .insert({ ...body, roaster_id: roasterId })
            .select("id, invoice_number")
            .single();
          if (error) return { success: false, error: error.message };
          return { success: true, id: data.id, data };
        }
        if (action.type === "UPDATE") {
          if (!entityId) return { success: false, error: "No invoice ID in endpoint" };
          // Only allow updating draft invoices
          const { data: existing } = await supabase
            .from("invoices")
            .select("id, status")
            .eq("id", entityId)
            .eq("roaster_id", roasterId)
            .maybeSingle();
          if (!existing) return { success: false, error: "Invoice not found or not owned" };
          if (existing.status !== "draft") return { success: false, error: "Only draft invoices can be updated" };

          const { data, error } = await supabase
            .from("invoices")
            .update(body)
            .eq("id", entityId)
            .eq("roaster_id", roasterId)
            .select("id, invoice_number")
            .single();
          if (error) return { success: false, error: error.message };
          return { success: true, data };
        }

        // Void — simple DB operation (no emails/webhooks)
        if (action.endpoint.includes("/void")) {
          if (!entityId) return { success: false, error: "No invoice ID in endpoint" };
          const { data: existing } = await supabase
            .from("invoices")
            .select("id, status")
            .eq("id", entityId)
            .eq("roaster_id", roasterId)
            .maybeSingle();
          if (!existing) return { success: false, error: "Invoice not found or not owned" };
          if (existing.status === "void") return { success: false, error: "Invoice is already void" };
          if (existing.status === "paid") return { success: false, error: "Cannot void a paid invoice" };

          const { data, error } = await supabase
            .from("invoices")
            .update({ status: "void", payment_status: "cancelled" })
            .eq("id", entityId)
            .eq("roaster_id", roasterId)
            .select("id, invoice_number")
            .single();
          if (error) return { success: false, error: error.message };
          return { success: true, data };
        }

        // send, record-payment, send-reminder — complex (email, PDF, Stripe, accounting sync)
        return NEEDS_FALLBACK;
      }

      // ─── Wholesale Buyers ───
      case "wholesale_buyers": {
        if (action.type === "CREATE") {
          // Creating a wholesale buyer involves user lookup — use fallback
          return NEEDS_FALLBACK;
        }

        if (action.type === "UPDATE") {
          if (!entityId) return { success: false, error: "No wholesale access ID in endpoint" };

          // Determine what we're updating based on action name and body
          const updateFields: Record<string, unknown> = {};
          const actionName = action.action.toLowerCase();

          if (actionName.includes("approve")) {
            updateFields.status = "approved";
            updateFields.approved_at = new Date().toISOString();
          } else if (actionName.includes("reject")) {
            updateFields.status = "rejected";
            if (body.reason) updateFields.rejected_reason = body.reason;
          } else if (actionName.includes("suspend")) {
            updateFields.status = "suspended";
          } else if (actionName.includes("reactivate")) {
            updateFields.status = "approved";
          } else {
            // Generic update — pass through body fields
            if (body.action === "approve") {
              updateFields.status = "approved";
              updateFields.approved_at = new Date().toISOString();
            } else if (body.action === "reject") {
              updateFields.status = "rejected";
              if (body.reason) updateFields.rejected_reason = body.reason;
            } else if (body.action === "suspend") {
              updateFields.status = "suspended";
            } else if (body.action === "reactivate") {
              updateFields.status = "approved";
            } else if (body.action === "update") {
              if (body.paymentTerms) updateFields.payment_terms = body.paymentTerms;
              if (body.price_tier) updateFields.price_tier = body.price_tier;
              if (body.credit_limit !== undefined) updateFields.credit_limit = body.credit_limit;
            } else {
              // Fallback: pass through known wholesale_access fields
              if (body.payment_terms) updateFields.payment_terms = body.payment_terms;
              if (body.paymentTerms) updateFields.payment_terms = body.paymentTerms;
              if (body.price_tier) updateFields.price_tier = body.price_tier;
              if (body.credit_limit !== undefined) updateFields.credit_limit = body.credit_limit;
              if (body.status) updateFields.status = body.status;
            }
          }

          if (Object.keys(updateFields).length === 0) {
            return { success: false, error: "No update fields resolved" };
          }

          const { data, error } = await supabase
            .from("wholesale_access")
            .update(updateFields)
            .eq("id", entityId)
            .eq("roaster_id", roasterId)
            .select("id, business_name, status")
            .single();
          if (error) return { success: false, error: error.message };
          if (!data) return { success: false, error: "Wholesale buyer not found or not owned" };
          return { success: true, data };
        }

        // Pricing sub-route
        if (action.endpoint.includes("/pricing")) {
          return NEEDS_FALLBACK;
        }

        return { success: false, error: `Unsupported wholesale action: ${action.action}` };
      }

      // ─── Green Beans ───
      case "green_beans": {
        // Stock movements
        if (action.endpoint.includes("/movements")) {
          if (!entityId) return { success: false, error: "No green bean ID in endpoint" };
          // Verify ownership and get current stock
          const { data: bean } = await supabase
            .from("green_beans")
            .select("id, current_stock_kg")
            .eq("id", entityId)
            .eq("roaster_id", roasterId)
            .maybeSingle();
          if (!bean) return { success: false, error: "Green bean not found or not owned" };

          const quantityKg = Number(body.quantity_kg) || 0;
          if (quantityKg === 0) return { success: false, error: "quantity_kg must be non-zero" };

          const movementType = body.movement_type as string;
          // Positive movements: purchase, adjustment (positive). Negative: roast, waste, sale, adjustment (negative)
          const newStock = bean.current_stock_kg + quantityKg;

          const { error: movError } = await supabase
            .from("green_bean_movements")
            .insert({
              green_bean_id: entityId,
              roaster_id: roasterId,
              movement_type: movementType,
              quantity_kg: quantityKg,
              balance_after_kg: Math.max(0, newStock),
              notes: (body.notes as string) || null,
              created_by: userId,
            });
          if (movError) return { success: false, error: movError.message };

          const { error: updateError } = await supabase
            .from("green_beans")
            .update({ current_stock_kg: Math.max(0, newStock) })
            .eq("id", entityId)
            .eq("roaster_id", roasterId);
          if (updateError) return { success: false, error: updateError.message };

          return { success: true, data: { new_stock_kg: Math.max(0, newStock) } };
        }

        if (action.type === "CREATE") {
          const { data, error } = await supabase
            .from("green_beans")
            .insert({ ...body, roaster_id: roasterId })
            .select("id, name")
            .single();
          if (error) return { success: false, error: error.message };
          return { success: true, id: data.id, data };
        }
        if (action.type === "UPDATE") {
          if (!entityId) return { success: false, error: "No green bean ID in endpoint" };
          const { data, error } = await supabase
            .from("green_beans")
            .update(body)
            .eq("id", entityId)
            .eq("roaster_id", roasterId)
            .select("id, name")
            .single();
          if (error) return { success: false, error: error.message };
          if (!data) return { success: false, error: "Green bean not found or not owned" };
          return { success: true, data };
        }
        if (action.type === "DELETE") {
          if (!entityId) return { success: false, error: "No green bean ID in endpoint" };
          const { error } = await supabase
            .from("green_beans")
            .delete()
            .eq("id", entityId)
            .eq("roaster_id", roasterId);
          if (error) return { success: false, error: error.message };
          return { success: true };
        }
        return { success: false, error: `Unsupported green beans action: ${action.action}` };
      }

      // ─── Roasted Stock ───
      case "roasted_stock": {
        // Stock movements
        if (action.endpoint.includes("/movements")) {
          if (!entityId) return { success: false, error: "No roasted stock ID in endpoint" };
          const { data: stock } = await supabase
            .from("roasted_stock")
            .select("id, current_stock_kg")
            .eq("id", entityId)
            .eq("roaster_id", roasterId)
            .maybeSingle();
          if (!stock) return { success: false, error: "Roasted stock not found or not owned" };

          const quantityKg = Number(body.quantity_kg) || 0;
          if (quantityKg === 0) return { success: false, error: "quantity_kg must be non-zero" };

          const movementType = body.movement_type as string;
          const newStock = stock.current_stock_kg + quantityKg;

          const { error: movError } = await supabase
            .from("roasted_stock_movements")
            .insert({
              roasted_stock_id: entityId,
              roaster_id: roasterId,
              movement_type: movementType,
              quantity_kg: quantityKg,
              balance_after_kg: Math.max(0, newStock),
              notes: (body.notes as string) || null,
              created_by: userId,
            });
          if (movError) return { success: false, error: movError.message };

          const { error: updateError } = await supabase
            .from("roasted_stock")
            .update({ current_stock_kg: Math.max(0, newStock) })
            .eq("id", entityId)
            .eq("roaster_id", roasterId);
          if (updateError) return { success: false, error: updateError.message };

          return { success: true, data: { new_stock_kg: Math.max(0, newStock) } };
        }

        if (action.type === "CREATE") {
          const { data, error } = await supabase
            .from("roasted_stock")
            .insert({ ...body, roaster_id: roasterId })
            .select("id, name")
            .single();
          if (error) return { success: false, error: error.message };
          return { success: true, id: data.id, data };
        }
        if (action.type === "UPDATE") {
          if (!entityId) return { success: false, error: "No roasted stock ID in endpoint" };
          const { data, error } = await supabase
            .from("roasted_stock")
            .update(body)
            .eq("id", entityId)
            .eq("roaster_id", roasterId)
            .select("id, name")
            .single();
          if (error) return { success: false, error: error.message };
          if (!data) return { success: false, error: "Roasted stock not found or not owned" };
          return { success: true, data };
        }
        if (action.type === "DELETE") {
          if (!entityId) return { success: false, error: "No roasted stock ID in endpoint" };
          const { error } = await supabase
            .from("roasted_stock")
            .delete()
            .eq("id", entityId)
            .eq("roaster_id", roasterId);
          if (error) return { success: false, error: error.message };
          return { success: true };
        }
        return { success: false, error: `Unsupported roasted stock action: ${action.action}` };
      }

      // ─── Production Plans ───
      case "production": {
        if (action.type === "CREATE") {
          const { data, error } = await supabase
            .from("production_plans")
            .insert({ ...body, roaster_id: roasterId })
            .select("id")
            .single();
          if (error) return { success: false, error: error.message };
          return { success: true, id: data.id, data };
        }
        if (action.type === "UPDATE") {
          if (!entityId) return { success: false, error: "No production plan ID in endpoint" };
          const { data, error } = await supabase
            .from("production_plans")
            .update(body)
            .eq("id", entityId)
            .eq("roaster_id", roasterId)
            .select("id")
            .single();
          if (error) return { success: false, error: error.message };
          if (!data) return { success: false, error: "Production plan not found or not owned" };
          return { success: true, data };
        }
        if (action.type === "DELETE") {
          if (!entityId) return { success: false, error: "No production plan ID in endpoint" };
          const { error } = await supabase
            .from("production_plans")
            .delete()
            .eq("id", entityId)
            .eq("roaster_id", roasterId);
          if (error) return { success: false, error: error.message };
          return { success: true };
        }
        return { success: false, error: `Unsupported production action: ${action.action}` };
      }

      // ─── Discount Codes ───
      case "discount_codes": {
        if (action.type === "CREATE") {
          const { data, error } = await supabase
            .from("discount_codes")
            .insert({ ...body, roaster_id: roasterId })
            .select("id, code")
            .single();
          if (error) return { success: false, error: error.message };
          return { success: true, id: data.id, data };
        }
        if (action.type === "UPDATE") {
          if (!entityId) return { success: false, error: "No discount code ID in endpoint" };
          const { data, error } = await supabase
            .from("discount_codes")
            .update(body)
            .eq("id", entityId)
            .eq("roaster_id", roasterId)
            .select("id, code")
            .single();
          if (error) return { success: false, error: error.message };
          if (!data) return { success: false, error: "Discount code not found or not owned" };
          return { success: true, data };
        }
        if (action.type === "DELETE") {
          if (!entityId) return { success: false, error: "No discount code ID in endpoint" };
          const { error } = await supabase
            .from("discount_codes")
            .delete()
            .eq("id", entityId)
            .eq("roaster_id", roasterId);
          if (error) return { success: false, error: error.message };
          return { success: true };
        }
        return { success: false, error: `Unsupported discount code action: ${action.action}` };
      }

      default:
        return NEEDS_FALLBACK;
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Direct execution failed",
    };
  }
}

// Sentinel value — signals the caller to use the internal fetch fallback
const NEEDS_FALLBACK: ActionResult = { success: false, error: "__NEEDS_FALLBACK__" };

// ── Fallback: internal fetch with cookie forwarding ──
// Used only for complex actions that involve emails, Stripe, webhooks, etc.

async function executeFallbackFetch(
  action: PlannedAction,
  baseUrl: string,
  cookieHeader: string
): Promise<ActionResult> {
  try {
    const url = `${baseUrl}${action.endpoint}`;
    const fetchOptions: RequestInit = {
      method: action.method,
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
    };

    if (action.method !== "GET" && action.method !== "DELETE") {
      fetchOptions.body = JSON.stringify(action.body || {});
    } else if (action.method === "DELETE" && action.body && Object.keys(action.body).length > 0) {
      fetchOptions.body = JSON.stringify(action.body);
    }

    const res = await fetch(url, fetchOptions);
    const responseData = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        error: responseData.error || responseData.message || `HTTP ${res.status}`,
      };
    }

    return { success: true, data: responseData };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Fallback fetch failed",
    };
  }
}

// ── Log to activity table ──

async function logActivity(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  action: PlannedAction,
  success: boolean,
  error?: string
) {
  await supabase.from("user_activity_log").insert({
    user_id: userId,
    action: `beans_${action.action}`,
    description: `${success ? "Completed" : "Failed"}: ${action.label}`,
    metadata: {
      beans_action_id: action.id,
      domain: action.domain,
      type: action.type,
      endpoint: action.endpoint,
      destructive: action.destructive,
      ...(error ? { error } : {}),
    },
    performed_by: userId,
  });
}

// ── Main handler ──

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("roaster") || !user.roaster) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roasterId = user.roaster.id;
  const userId = user.id;
  const supabase = createServerClient();

  try {
    const { plan } = (await request.json()) as { plan: PlannedAction[] };

    if (!plan || !Array.isArray(plan) || plan.length === 0) {
      return Response.json({ error: "Plan is required" }, { status: 400 });
    }

    // Capture headers for fallback fetch (complex actions only)
    const headersList = await headers();
    const host = headersList.get("host") || "localhost:3001";
    const proto = headersList.get("x-forwarded-proto") || "http";
    const baseUrl = `${proto}://${host}`;
    const cookieHeader = headersList.get("cookie") || "";

    // Filter out conflicting and READ-only actions
    const executableActions = plan.filter(
      (a) =>
        a.type !== "READ" &&
        (!a.conflictsWith || a.conflictsWith.length === 0) &&
        a.endpoint &&
        a.method
    );

    // SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function send(event: string, data: unknown) {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        }

        const completed = new Set<string>();
        const failed = new Set<string>();
        // Registry mapping Gemini placeholder action IDs → real DB IDs
        const idRegistry = new Map<string, string>();

        try {
          // Build a dependency graph
          const pending = new Map<string, PlannedAction>();
          for (const action of executableActions) {
            pending.set(action.id, action);
          }

          // Execute in waves: each wave runs all actions whose dependencies are met
          while (pending.size > 0) {
            // Find actions ready to run (all dependsOn completed)
            const ready: PlannedAction[] = [];
            for (const [id, action] of pending) {
              const deps = action.dependsOn || [];
              const depsComplete = deps.every(
                (depId) => completed.has(depId) || !pending.has(depId)
              );
              // If any dependency failed, skip this action
              const depsFailed = deps.some((depId) => failed.has(depId));
              if (depsFailed) {
                pending.delete(id);
                failed.add(id);
                send("progress", {
                  actionId: id,
                  status: "failed",
                  error: "Dependency failed",
                });
                console.error(`[Beans] Action skipped (dependency failed): ${action.action}`, {
                  actionId: id,
                  endpoint: action.endpoint,
                  roasterId,
                });
                await logActivity(supabase, userId, action, false, "Dependency failed");
                continue;
              }
              if (depsComplete) {
                ready.push(action);
              }
            }

            if (ready.length === 0 && pending.size > 0) {
              // Circular dependency or stuck — fail remaining
              for (const [id, action] of pending) {
                send("progress", {
                  actionId: id,
                  status: "failed",
                  error: "Unresolvable dependency",
                });
                console.error(`[Beans] Action stuck (unresolvable dependency): ${action.action}`, {
                  actionId: id,
                  endpoint: action.endpoint,
                  dependsOn: action.dependsOn,
                  roasterId,
                });
                await logActivity(supabase, userId, action, false, "Unresolvable dependency");
              }
              break;
            }

            // Mark all ready actions as running
            for (const action of ready) {
              send("progress", { actionId: action.id, status: "running" });
            }

            // Execute ready actions in parallel (within a wave)
            const results = await Promise.allSettled(
              ready.map(async (action) => {
                // Substitute placeholder IDs with real DB IDs from prior waves
                const resolvedAction = { ...action };
                if (idRegistry.size > 0) {
                  resolvedAction.body = substituteIds(action.body || {}, idRegistry);
                  resolvedAction.endpoint = substituteEndpoint(action.endpoint, idRegistry);
                }

                // Try direct execution first
                let result = await executeDirectly(resolvedAction, supabase, roasterId, userId);

                // If direct execution says it needs fallback, use internal fetch
                if (result.error === "__NEEDS_FALLBACK__") {
                  if (!cookieHeader) {
                    console.error(`[Beans] Fallback fetch needed but no cookie available: ${resolvedAction.action}`, {
                      actionId: resolvedAction.id,
                      endpoint: resolvedAction.endpoint,
                      roasterId,
                    });
                    result = {
                      success: false,
                      error: "This action requires complex processing that is not available in direct mode. Please perform it manually.",
                    };
                  } else {
                    result = await executeFallbackFetch(resolvedAction, baseUrl, cookieHeader);
                    if (!result.success) {
                      console.error(`[Beans] Fallback fetch failed: ${resolvedAction.action}`, {
                        actionId: resolvedAction.id,
                        endpoint: resolvedAction.endpoint,
                        error: result.error,
                        roasterId,
                      });
                    }
                  }
                } else if (!result.success) {
                  console.error(`[Beans] Action failed: ${resolvedAction.action}`, {
                    actionId: resolvedAction.id,
                    endpoint: resolvedAction.endpoint,
                    error: result.error,
                    body: resolvedAction.body,
                    roasterId,
                  });
                }

                return { action, result };
              })
            );

            // Process results
            for (const settled of results) {
              if (settled.status === "rejected") {
                continue; // Shouldn't happen with our error handling
              }

              const { action, result } = settled.value;
              pending.delete(action.id);

              if (result.success) {
                completed.add(action.id);
                // Register returned ID for dependency chaining
                if (result.id) {
                  idRegistry.set(action.id, result.id);
                }
                // Also try to extract ID from fallback fetch data
                if (!result.id && result.data && typeof result.data === "object") {
                  const dataObj = result.data as Record<string, unknown>;
                  if (typeof dataObj.id === "string") {
                    idRegistry.set(action.id, dataObj.id);
                  }
                }
                send("progress", { actionId: action.id, status: "done" });
              } else {
                failed.add(action.id);
                send("progress", {
                  actionId: action.id,
                  status: "failed",
                  error: result.error,
                });
              }

              await logActivity(supabase, userId, action, result.success, result.error);
            }
          }

          send("complete", {
            total: executableActions.length,
            completed: completed.size,
            failed: failed.size,
          });
        } catch (err) {
          console.error("[Beans] Execute stream error:", err);
          send("error", {
            error: err instanceof Error ? err.message : "Execution failed",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[Beans] Execute error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
