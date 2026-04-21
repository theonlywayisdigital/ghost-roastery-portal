import { GoogleGenAI, Type } from "@google/genai";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// ── Read tool declarations for Gemini ──

const readToolDeclarations = [
  {
    name: "get_products",
    description:
      "Retrieves all products for the roaster including current prices, variants, stock links, and status. Call this before any product mutations.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "get_contacts",
    description:
      "Retrieves contacts for the roaster with optional filters. Call this before any contact mutations.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        search: { type: Type.STRING, description: "Search by name, email, or business" },
        type: { type: Type.STRING, description: 'Filter: "wholesale", "retail", "supplier", "lead"' },
        status: { type: Type.STRING, description: 'Filter: "active", "archived"' },
      },
    },
  },
  {
    name: "get_orders",
    description:
      "Retrieves all orders for the roaster (ghost, storefront, and wholesale). Call this before any order mutations.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        tab: { type: Type.STRING, description: '"all", "ghost", "storefront", "wholesale"' },
        status: { type: Type.STRING, description: "Filter by order status" },
      },
    },
  },
  {
    name: "get_invoices",
    description:
      "Retrieves invoices for the roaster with optional filters. Call this before any invoice mutations.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING, description: '"draft", "sent", "overdue", "paid", "void"' },
      },
    },
  },
  {
    name: "get_wholesale_buyers",
    description:
      "Retrieves all wholesale buyers for the roaster including approval status and payment terms.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "get_green_beans",
    description:
      "Retrieves all green bean inventory for the roaster including stock levels.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "get_roasted_stock",
    description:
      "Retrieves all roasted stock profiles for the roaster including stock levels and linked green beans.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "get_production_plans",
    description:
      "Retrieves all production plans for the roaster.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "get_discount_codes",
    description:
      "Retrieves discount codes for the roaster with optional filters.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING, description: '"active", "paused", "expired", "archived"' },
      },
    },
  },
];

// ── Write action schemas (described to Gemini so it can build plans) ──

const WRITE_ACTIONS_DESCRIPTION = `
After fetching data with the read tools above, you must return a final text response containing ONLY a JSON object with this exact shape:
{
  "plan": [
    {
      "id": "<uuid you generate>",
      "domain": "<products|contacts|orders|invoices|wholesale_buyers|green_beans|roasted_stock|production|discount_codes>",
      "action": "<descriptive action name, e.g. update_product_price, create_contact, cancel_order>",
      "label": "<human-readable label, e.g. Update price: Brazil Natural 250g>",
      "type": "<CREATE|UPDATE|DELETE|READ>",
      "destructive": <true if action is irreversible: delete product, cancel order, send invoice, send campaign, void invoice, delete green bean, delete roasted stock, delete roast log>,
      "endpoint": "<the API path, e.g. /api/products/abc-123>",
      "method": "<POST|PUT|PATCH|DELETE>",
      "body": {<the request body to send>},
      "dependsOn": [<ids of actions that must complete first>],
      "conflictsWith": [<ids of actions that conflict — e.g. two price updates on same product>],
      "diff": [{"field": "<field name>", "from": "<current value>", "to": "<new value>"}]
    }
  ],
  "summary": "<one sentence summary of the plan>"
}

Available write endpoints (use the real IDs from your read tool results):

PRODUCTS:
- PUT /api/products/{id} — Update product (price, name, description, status, etc.)
- PATCH /api/products/{id} — Quick update (status, is_retail, is_wholesale, sort_order only)
- POST /api/products — Create new product (name, price, unit required)
- DELETE /api/products/{id} — Delete product (DESTRUCTIVE)

CONTACTS:
- POST /api/contacts — Create contact (first_name, last_name, email, types[], source)
- PUT /api/contacts/{id} — Update contact fields
- DELETE /api/contacts/{id} — Archive contact (soft delete)
- POST /api/contacts/{id}/notes — Add note (content required)
- POST /api/contacts/{id}/activity — Log activity (activity_type, description required)

ORDERS:
- POST /api/orders/create-manual — Create order (DESTRUCTIVE — deducts stock, creates invoice)
  Body: orderChannel, customerName, customerEmail, items[], deliveryAddress, paymentMethod
- PATCH /api/orders/{id}/status — Update status (status, trackingNumber, trackingCarrier)
  Valid transitions: pending→confirmed, confirmed→dispatched, dispatched→delivered
- PUT /api/orders/{id}/status — Update tracking only (trackingNumber, trackingCarrier)
- POST /api/orders/{id}/cancel — Cancel order (DESTRUCTIVE — refunds, replenishes stock)
  Body: reasonCategory, reason
- POST /api/orders/{id}/mark-paid — Mark paid (paymentMethod: cash|card|bank_transfer|stripe|other)
- POST /api/orders/{id}/activity — Add note (description)

INVOICES:
- POST /api/invoices — Create invoice (line_items[], customer_id, business_id, order_ids[], due_days, tax_rate)
- PUT /api/invoices/{id} — Update draft invoice
- POST /api/invoices/{id}/send — Send invoice (DESTRUCTIVE — sends email, cannot unsend)
- POST /api/invoices/{id}/record-payment — Record payment (amount, payment_method)
- POST /api/invoices/{id}/void — Void invoice (DESTRUCTIVE)
- POST /api/invoices/{id}/send-reminder — Send payment reminder

WHOLESALE BUYERS:
- POST /api/wholesale-buyers — Add wholesale customer (firstName, lastName, email, businessName, paymentTerms)
- PATCH /api/wholesale-buyers/{id}/access — Approve/reject/suspend/update (action: approve|reject|suspend|reactivate|update)
- POST /api/wholesale-buyers/{id}/pricing — Set custom pricing (product_id, variant_id, custom_price)

GREEN BEANS:
- POST /api/tools/green-beans — Create green bean (name, origin_country, current_stock_kg)
- PUT /api/tools/green-beans/{id} — Update green bean
- DELETE /api/tools/green-beans/{id} — Delete (DESTRUCTIVE)
- POST /api/tools/green-beans/{id}/movements — Record stock movement (movement_type, quantity_kg)

ROASTED STOCK:
- POST /api/tools/roasted-stock — Create roasted stock (name, green_bean_id, current_stock_kg)
- PATCH /api/tools/roasted-stock/{id} — Update roasted stock
- DELETE /api/tools/roasted-stock/{id} — Delete (DESTRUCTIVE)
- POST /api/tools/roasted-stock/{id}/movements — Record stock movement (movement_type, quantity_kg)

PRODUCTION:
- POST /api/tools/production — Create plan (planned_date, green_bean_id, planned_weight_kg, roasted_stock_id)
- PUT /api/tools/production/{id} — Update plan
- DELETE /api/tools/production/{id} — Delete plan

DISCOUNT CODES:
- POST /api/marketing/discount-codes — Create code (code, discount_type, discount_value, starts_at, expires_at)
- PUT /api/marketing/discount-codes/{id} — Update code
- DELETE /api/marketing/discount-codes/{id} — Delete code

RULES:
- Generate a UUID v4 for each action's "id" field (format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx).
- For updates, ALWAYS include a diff array showing field, from (current value), and to (new value).
- If an action depends on another (e.g. create order needs contact), set dependsOn to that action's id.
- If two actions conflict (e.g. two updates to same product price), set conflictsWith on BOTH actions.
- NEVER include these actions: change password, delete account, remove team member.
- For read-only requests (e.g. "show me X"), return the data as a plan with type "READ" and no endpoint/method/body.
- Today's date is ${new Date().toISOString().split("T")[0]}.
`;

const SYSTEM_PROMPT = `You are Beans, an AI assistant for a coffee roastery platform. When given an instruction, you build a structured execution plan using the available tools.

WORKFLOW:
1. ALWAYS call read tools first to fetch real data (product IDs, contact IDs, etc.)
2. Use the real IDs and values from the data to construct your plan
3. Return ONLY a JSON plan object — no prose, no markdown, no explanation outside the JSON

ASSUMPTIONS — DO NOT ASK CLARIFYING QUESTIONS:
- When information is ambiguous or missing, make a reasonable assumption and proceed.
- State your assumption clearly in the action label (e.g. "Update price: Brazil Natural 250g — assumed retail price only").
- Use sensible defaults: status "draft" for new products, "active" for discount codes, "wholesale" channel for B2B orders, today's date for start dates, etc.
- When the user says "cheapest product", pick the one with the lowest price. When they say "most recent contact", pick the one created most recently. When they say "all", they mean all matching records.
- ONLY ask a question (as a plain text response, not a JSON plan) if it is genuinely impossible to proceed — for example, a contact name that matches nobody in the database, or a request that is completely unclear.
- If you must ask a question, keep it to one sentence and suggest the most likely answer.

${WRITE_ACTIONS_DESCRIPTION}`;

// ── Read tool implementations ──

async function executeGetProducts(roasterId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, price, retail_price, wholesale_price, status, is_retail, is_wholesale, unit, sku, category, description, product_variants(id, weight_grams, unit, retail_price, wholesale_price, channel, is_active, grind_type_id)"
    )
    .eq("roaster_id", roasterId)
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(`Failed to fetch products: ${error.message}`);
  return data || [];
}

async function executeGetContacts(
  roasterId: string,
  params: { search?: string; type?: string; status?: string }
) {
  const supabase = createServerClient();
  let query = supabase
    .from("contacts")
    .select("id, first_name, last_name, email, phone, business_name, types, source, status, created_at, last_activity_at")
    .eq("roaster_id", roasterId);

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  } else {
    query = query.eq("status", "active");
  }
  if (params.type) {
    query = query.contains("types", [params.type]);
  }
  if (params.search) {
    query = query.or(
      `first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,email.ilike.%${params.search}%,business_name.ilike.%${params.search}%`
    );
  }

  query = query.order("created_at", { ascending: false }).limit(100);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch contacts: ${error.message}`);
  return data || [];
}

async function executeGetOrders(
  roasterId: string,
  userId: string,
  isGhostRoaster: boolean,
  params: { tab?: string; status?: string }
) {
  const supabase = createServerClient();
  const tab = params.tab || "all";
  const results: Array<Record<string, unknown>> = [];

  // Ghost orders (platform orders allocated to this roaster)
  if ((tab === "all" || tab === "ghost") && isGhostRoaster) {
    let query = supabase
      .from("ghost_orders")
      .select("id, order_number, customer_name, customer_email, items, total_price, order_status, payment_status, created_at, required_by_date")
      .eq("partner_roaster_id", roasterId);

    if (params.status) query = query.eq("order_status", params.status);
    query = query.order("created_at", { ascending: false }).limit(50);

    const { data } = await query;
    for (const o of data || []) {
      results.push({
        id: o.id,
        orderNumber: o.order_number,
        orderType: "ghost",
        customerName: o.customer_name,
        customerEmail: o.customer_email,
        total: o.total_price,
        status: o.order_status,
        paymentStatus: o.payment_status,
        date: o.created_at,
        requiredByDate: o.required_by_date,
      });
    }
  }

  // Storefront & wholesale orders
  if (tab === "all" || tab === "storefront" || tab === "wholesale") {
    let query = supabase
      .from("orders")
      .select("id, order_number, customer_name, customer_email, customer_business, items, subtotal, status, payment_method, order_channel, created_at, required_by_date")
      .eq("roaster_id", roasterId);

    if (tab === "storefront") query = query.eq("order_channel", "storefront");
    if (tab === "wholesale") query = query.eq("order_channel", "wholesale");
    if (params.status) query = query.eq("status", params.status);
    query = query.order("created_at", { ascending: false }).limit(50);

    const { data } = await query;
    for (const o of data || []) {
      results.push({
        id: o.id,
        orderNumber: o.order_number,
        orderType: o.order_channel || "storefront",
        customerName: o.customer_name,
        customerEmail: o.customer_email,
        customerBusiness: o.customer_business,
        total: o.subtotal,
        status: o.status,
        date: o.created_at,
        requiredByDate: o.required_by_date,
      });
    }
  }

  return results;
}

async function executeGetInvoices(
  roasterId: string,
  params: { status?: string }
) {
  const supabase = createServerClient();
  let query = supabase
    .from("invoices")
    .select("id, invoice_number, customer_id, business_id, subtotal, total, amount_paid, amount_due, status, payment_status, payment_due_date, currency, created_at, notes")
    .eq("roaster_id", roasterId);

  if (params.status) query = query.eq("status", params.status);
  query = query.order("created_at", { ascending: false }).limit(50);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch invoices: ${error.message}`);
  return data || [];
}

async function executeGetWholesaleBuyers(roasterId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("wholesale_access")
    .select("id, user_id, status, business_name, business_type, payment_terms, price_tier, credit_limit, created_at, approved_at, rejected_reason, users(email)")
    .eq("roaster_id", roasterId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch wholesale buyers: ${error.message}`);
  return data || [];
}

async function executeGetGreenBeans(roasterId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("green_beans")
    .select("id, name, origin_country, origin_region, variety, process, current_stock_kg, low_stock_threshold_kg, cost_per_kg, is_active, suppliers(name)")
    .eq("roaster_id", roasterId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch green beans: ${error.message}`);
  return data || [];
}

async function executeGetRoastedStock(roasterId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("roasted_stock")
    .select("id, name, green_bean_id, current_stock_kg, low_stock_threshold_kg, batch_size_kg, is_active, green_beans(name)")
    .eq("roaster_id", roasterId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch roasted stock: ${error.message}`);
  return data || [];
}

async function executeGetProductionPlans(roasterId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("production_plans")
    .select("id, planned_date, green_bean_id, green_bean_name, roasted_stock_id, planned_weight_kg, expected_roasted_kg, expected_loss_percent, priority, status, notes, green_beans(name), roasted_stock(name)")
    .eq("roaster_id", roasterId)
    .order("planned_date", { ascending: true });

  if (error) throw new Error(`Failed to fetch production plans: ${error.message}`);
  return data || [];
}

async function executeGetDiscountCodes(roasterId: string, params: { status?: string }) {
  const supabase = createServerClient();
  let query = supabase
    .from("discount_codes")
    .select("id, code, description, discount_type, discount_value, currency, minimum_order_value, usage_limit, usage_count, starts_at, expires_at, status, auto_apply, first_order_only, created_at")
    .eq("roaster_id", roasterId);

  if (params.status) query = query.eq("status", params.status);
  query = query.order("created_at", { ascending: false }).limit(50);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch discount codes: ${error.message}`);
  return data || [];
}

// ── Main handler ──

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI generation is not configured" },
      { status: 503 }
    );
  }

  const user = await getCurrentUser();
  if (!user?.roles.includes("roaster") || !user.roaster) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roasterId = user.roaster.id;
  const isGhostRoaster = !!(
    user.roaster.is_ghost_roaster &&
    user.roaster.is_verified &&
    user.roaster.is_active
  );

  try {
    const { message, history } = await request.json();
    if (!message || typeof message !== "string") {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const contents: Array<{
      role: "user" | "model";
      parts: Array<{
        text?: string;
        functionCall?: { name: string; args: Record<string, unknown> };
        functionResponse?: { name: string; response: Record<string, unknown> };
      }>;
    }> = [];

    // Rebuild conversation history if provided (for follow-up replies)
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        });
      }
    }

    contents.push({ role: "user", parts: [{ text: message }] });

    // SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function send(event: string, data: unknown) {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        }

        try {
          let currentContents = [...contents];
          let iterations = 0;
          const MAX_ITERATIONS = 8;

          while (iterations < MAX_ITERATIONS) {
            iterations++;

            const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: currentContents,
              config: {
                systemInstruction: SYSTEM_PROMPT,
                tools: [{ functionDeclarations: readToolDeclarations }],
              },
            });

            const functionCalls = response.functionCalls;

            if (!functionCalls || functionCalls.length === 0) {
              // Model returned text — should be the JSON plan
              const text = response.text || "";

              // Try to parse the plan from the response
              let plan;
              try {
                plan = JSON.parse(text);
              } catch {
                // Try to extract JSON from markdown/prose
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  plan = JSON.parse(jsonMatch[0]);
                }
              }

              if (plan?.plan && Array.isArray(plan.plan)) {
                // Stream each action as a separate event
                for (const action of plan.plan) {
                  send("action", action);
                }
                send("summary", { text: plan.summary || "" });
              } else {
                // Model returned prose instead of a plan — send as message
                send("message", { text });
              }
              break;
            }

            // Process function calls
            const functionResponseParts: Array<{
              functionResponse: { name: string; response: Record<string, unknown> };
            }> = [];

            for (const fc of functionCalls) {
              const args = (fc.args || {}) as Record<string, unknown>;
              let result: unknown;

              try {
                switch (fc.name) {
                  case "get_products":
                    result = { products: await executeGetProducts(roasterId) };
                    send("tool_call", { tool: fc.name, summary: "Fetching products..." });
                    break;

                  case "get_contacts":
                    result = {
                      contacts: await executeGetContacts(roasterId, {
                        search: args.search as string | undefined,
                        type: args.type as string | undefined,
                        status: args.status as string | undefined,
                      }),
                    };
                    send("tool_call", { tool: fc.name, summary: "Fetching contacts..." });
                    break;

                  case "get_orders":
                    result = {
                      orders: await executeGetOrders(roasterId, user.id, isGhostRoaster, {
                        tab: args.tab as string | undefined,
                        status: args.status as string | undefined,
                      }),
                    };
                    send("tool_call", { tool: fc.name, summary: "Fetching orders..." });
                    break;

                  case "get_invoices":
                    result = {
                      invoices: await executeGetInvoices(roasterId, {
                        status: args.status as string | undefined,
                      }),
                    };
                    send("tool_call", { tool: fc.name, summary: "Fetching invoices..." });
                    break;

                  case "get_wholesale_buyers":
                    result = { buyers: await executeGetWholesaleBuyers(roasterId) };
                    send("tool_call", { tool: fc.name, summary: "Fetching wholesale buyers..." });
                    break;

                  case "get_green_beans":
                    result = { greenBeans: await executeGetGreenBeans(roasterId) };
                    send("tool_call", { tool: fc.name, summary: "Fetching green beans..." });
                    break;

                  case "get_roasted_stock":
                    result = { roastedStock: await executeGetRoastedStock(roasterId) };
                    send("tool_call", { tool: fc.name, summary: "Fetching roasted stock..." });
                    break;

                  case "get_production_plans":
                    result = { productionPlans: await executeGetProductionPlans(roasterId) };
                    send("tool_call", { tool: fc.name, summary: "Fetching production plans..." });
                    break;

                  case "get_discount_codes":
                    result = {
                      discountCodes: await executeGetDiscountCodes(roasterId, {
                        status: args.status as string | undefined,
                      }),
                    };
                    send("tool_call", { tool: fc.name, summary: "Fetching discount codes..." });
                    break;

                  default:
                    result = { error: `Unknown tool: ${fc.name}` };
                }
              } catch (err) {
                result = {
                  error: err instanceof Error ? err.message : "Tool execution failed",
                };
                send("error", { tool: fc.name, error: (result as { error: string }).error });
              }

              functionResponseParts.push({
                functionResponse: {
                  name: fc.name,
                  response: result as Record<string, unknown>,
                },
              });
            }

            // Add function call + response to conversation
            currentContents.push({
              role: "model",
              parts: functionCalls.map((fc) => ({
                functionCall: {
                  name: fc.name,
                  args: (fc.args || {}) as Record<string, unknown>,
                },
              })),
            });
            currentContents.push({
              role: "user",
              parts: functionResponseParts,
            });
          }

          send("done", {});
        } catch (err) {
          send("error", {
            error: err instanceof Error ? err.message : "An unexpected error occurred",
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
    console.error("Beans plan error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
