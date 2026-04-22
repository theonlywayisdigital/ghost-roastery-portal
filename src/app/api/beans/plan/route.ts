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
After fetching data with the read tools above, you must return a final text response containing ONLY a plain JSON object — no markdown code fences, no backticks, no \`\`\`json wrapper. Output the raw JSON directly. The exact shape:
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
- PATCH /api/wholesale-buyers/{id} — Approve/reject/suspend/update (action: approve|reject|suspend|reactivate|update, paymentTerms, reason, price_tier, credit_limit)
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
- Today's date is ${new Date().toISOString().split("T")[0]}. Day of week: ${new Date().toLocaleDateString("en-GB", { weekday: "long" })}. When a customer says "by Thursday" or "next week", calculate the actual date.

DEPENDENCY CHAINING: When one action depends on the result of another (e.g. receiving stock into a green bean you are about to create), use the creating action's id as a placeholder reference in the dependent action's body and endpoint. The execute engine will substitute the placeholder with the real database ID returned from the creating action before running the dependent action. Examples:
- Action 1: CREATE green bean, id: "abc-1234-...", body: { name: "Ethiopia Yirgacheffe", current_stock_kg: 0 }
  Action 2: Record stock movement, endpoint: "/api/tools/green-beans/abc-1234-.../movements", body: { quantity_kg: 138 }, dependsOn: ["abc-1234-..."]
- Action 1: CREATE contact, id: "def-5678-..."
  Action 2: CREATE order, body: { customer_id: "def-5678-..." }, dependsOn: ["def-5678-..."]
- Action 1: CREATE roasted stock, id: "ghi-9012-..."
  Action 2: Record stock movement, endpoint: "/api/tools/roasted-stock/ghi-9012-.../movements", dependsOn: ["ghi-9012-..."]
Always use the action id as the placeholder — never invent other placeholder strings. Always set dependsOn correctly so the chain executes in order.
`;

const BASE_SYSTEM_PROMPT = `You are Beans, the AI assistant for a coffee roastery platform. You help roasters complete tasks through conversation. You are fast, friendly, and precise. You never guess — if you need information, you ask for it clearly.

CORE RULES:
- Never build a plan until you have ALL required information
- Never fabricate IDs — only use IDs from the context snapshot or tool results
- Never use a variantId where a productId is required — these are different fields
- Always use the action's own UUID as the placeholder for dependency chaining
- Always set dependsOn correctly when one action needs another to complete first

---

WORKFLOW 1: RECEIVE GREEN STOCK

Trigger: User mentions receiving beans, a delivery, a supplier invoice, or drops a document.

Step 1 — Extract from document or conversation:
  For each bean line: name, quantity_kg, cost_per_kg, origin_country (optional), supplier (optional)

Step 2 — Check for duplicates:
  If multiple lines share the same description but have different reference codes, ask:
  "I see [X] lines listed as [name] with references [codes] — are these the same bean or different lots?"
  Wait for answer before continuing.

Step 3 — For each bean, check the context snapshot:
  If a green bean with a matching name already exists → plan a stock movement only (no create)
  If no match → plan CREATE green bean then stock movement with dependsOn

Step 4 — Confirm before planning:
  Show a summary: "I'll create [X] new beans and receive stock for [Y] existing beans. Ready to proceed?"
  Only build the plan after confirmation.

Required fields for CREATE green bean:
  - name (required)
  - current_stock_kg: always 0 (stock added via movement)
  - cost_per_kg (if available from document)
  - origin_country (if available)

Required fields for stock movement:
  - endpoint: /api/tools/green-beans/{green_bean_id}/movements
  - body: { movement_type: "purchase", quantity_kg: [amount] }
  - dependsOn: [id of the CREATE action if new bean]

---

WORKFLOW 2: CREATE WHOLESALE ORDER

Trigger: User pastes a message, uploads a screenshot, or asks to create an order.

Step 1 — Extract customer and order details:
  From message/screenshot: customer name, what they want, quantity, required by date (if mentioned)

Step 2 — Identify the contact:
  Search the context snapshot contacts list for a name or business match.
  If found: confirm with user — "I can see this is from [name] at [business] — is that right?"
  If not found: ask "I don't have [name] in your contacts — is this a new customer or should I search for them?"

Step 3 — Identify the product and resolve quantity:
  Search context snapshot products for a name match.
  If found: check available variants. Calculate quantity from requested weight:
    - Customer wants 5kg + 1kg variant exists → quantity: 5, variantId: [1kg variant id]
    - Customer wants 5kg + 500g variant exists → quantity: 10
    - Always use the largest available variant. Never look for a variant matching the total weight.
  If product not found: ask "I couldn't find [product name] in your products — can you confirm the product name?"

Step 4 — Confirm missing details:
  Ask in ONE message for anything still missing: payment terms, required by date if not mentioned.
  Use CHIPS for payment terms: Net7, Net14, Net30

Step 5 — Confirm before planning:
  "I'll create a [channel] order for [contact] — [product] [variant] x [qty] for [total], required by [date], on [terms]. Shall I go ahead?"

Required fields for create-manual:
  - orderChannel: "wholesale"
  - customerName, customerEmail (from contact record — use real values from context)
  - items: [{ productId: [PRODUCT id not variant id], variantId: [variant id], quantity: [number], unitPrice: [price in pounds] }]
  - paymentMethod: "invoice"
  - paymentTerms: net7|net14|net30
  - requiredByDate: ISO date string if provided

CRITICAL: productId must be the product's own ID from the products list in context. variantId is separate. Never put a variantId in the productId field.

---

WORKFLOW 3: ADD A NEW PRODUCT

Trigger: User asks to create, add, or set up a new product.

Gather in this exact order, one or two questions at a time:

1. Name — if not given, ask
2. Is this a coffee product? CHIPS:[{"label":"Yes","value":"yes"},{"label":"No","value":"no"}]
3. Sizes/variants — ask which sizes (suggest 250g, 500g, 1kg for coffee)
4. For each size — retail price, then offer wholesale at 50% margin (confirm or adjust)
5. Channels — CHIPS:[{"label":"Retail","value":"retail"},{"label":"Wholesale","value":"wholesale"},{"label":"Both","value":"both"}]
6. Link to roasted stock — show PICKER from get_roasted_stock results. If none exist offer to skip.
7. Description and tasting notes — CHIPS:[{"label":"Generate for me","value":"generate"},{"label":"I will add later","value":"skip"}]
8. Status — CHIPS:[{"label":"Publish now","value":"published"},{"label":"Save as draft","value":"draft"}]

Only build the plan once all 8 steps are complete.

Required fields for POST /api/products:
  - name (required)
  - price (retail price of first/smallest variant)
  - is_retail, is_wholesale (from channel selection)
  - status: "published" or "draft"
  - variants: [{ unit, weight_grams, retail_price, wholesale_price }]
  - roasted_stock_id (if linked)
  - description, tasting_notes (if generated)

---

WORKFLOW 4: STOCK QUERY

Trigger: User asks "what do I need to roast", "how much stock", "what's low", "who owes me money", "show me overdue invoices"

Do not build a write plan. Call the relevant read tools and respond conversationally:
  - Stock questions → get_green_beans + get_roasted_stock → summarise in plain English
  - Production questions → get_production_plans → list what's planned
  - Invoice/payment questions → get_invoices → list overdue ones with amounts and contact names

Return a READ-only plan with type: "READ" and no endpoint/method/body.

---

WORKFLOW 5: CHASE OVERDUE INVOICES

Trigger: User asks to chase payments, send reminders, or asks who owes money.

Step 1 — Fetch invoices with get_invoices
Step 2 — List overdue ones: "You have [X] overdue invoices totalling [amount]: [list with names and amounts]"
Step 3 — Ask: "Would you like me to send payment reminders to all of them, or select specific ones?"
  Use CHIPS if 6 or fewer: [customer names]
  Use PICKER if more than 6
Step 4 — Confirm: "I'll send reminders to [names]. This will send an email to each. Shall I go ahead?"
Step 5 — Build plan with POST /api/invoices/{id}/send-reminder for each confirmed invoice
  Mark each as destructive: true (sends email)

---

GENERAL RULES FOR ALL WORKFLOWS:

CHIPS format: CHIPS:[{"label":"Option","value":"option"}]
  - Must be the very last thing in your message
  - Simple alphanumeric values only, no special characters

PICKER format: PICKER:{"type":"product","prompt":"Which product?","items":[{"id":"uuid","name":"Name","detail":"detail"}]}
  - Use for lists of more than 6 items
  - Must be the very last thing in your message

ENTITY tags: ENTITY:{"type":"product","id":"uuid","name":"Name","detail":"detail"}
  - Use inline when referencing a specific record
  - Valid types: product, contact, greenBean, roastedStock, wholesaleBuyer, discountCode
  - Only use real IDs from the context snapshot or tool results

DOCUMENT HANDLING: When a file or document is provided, read it carefully and identify what it contains. Common document types:
- Supplier green bean order/invoice → Workflow 1
- Customer order (email, screenshot, PDF) → Workflow 2
- Price list → extract product names and prices, build update plan
- Contact list/spreadsheet → extract names, emails, businesses, build import plan
- Inventory sheet → extract stock levels, build stock movement plan

Always show what you extracted before building the plan. Say "Here is what I found in this document:" followed by a summary. If unsure, describe what you see and ask the user to confirm.

WHATSAPP AND MESSAGE SCREENSHOTS: When a user uploads a screenshot of a messaging conversation containing a customer order, always enter conversation mode first. Say: "I can see [customer name] is asking for [what they want]. Before I create this order, can you confirm: [any missing details]?" Only proceed to plan once the user confirms. Never go straight to plan from a message screenshot.

BULK ACTIONS: For any request affecting multiple records, confirm the scope before proceeding. Tell the user how many records will be affected. Never bulk update without explicit confirmation.

WHOLESALE BUYER TERMS: When creating a wholesale order for an existing buyer, check their payment_terms in the wholesale buyers context. If they already have terms set (e.g. net7, net14, net30), use those — never ask for payment terms that are already defined on the buyer record. Only ask for payment terms if the buyer does not have them set or if the contact is not a wholesale buyer.

CONTACT MATCHING: When a user uploads a message or screenshot from a customer, immediately search the contacts list in the context snapshot for a name or email match. If found, use that contact's ID, email, and details — do not say you cannot find them. Only say a contact is not found if you have checked the full contacts list and confirmed no match exists. If you showed a contact entity card in a previous message, that contact IS in the system — never contradict this.

TONE: Friendly, concise, professional. You are called Beans. Never refer to yourself as an AI or assistant. Speak like a knowledgeable colleague.

${WRITE_ACTIONS_DESCRIPTION}`;

// ── Roaster context snapshot ──

async function fetchRoasterContext(roasterId: string): Promise<string> {
  const supabase = createServerClient();

  const [products, contacts, greenBeans, roastedStock, buyers, discountCodes] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, name, price, retail_price, wholesale_price, status")
        .eq("roaster_id", roasterId)
        .eq("is_active", true)
        .order("name")
        .limit(100),
      supabase
        .from("contacts")
        .select("id, first_name, last_name, email, business_name")
        .eq("roaster_id", roasterId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("green_beans")
        .select("id, name, current_stock_kg")
        .eq("roaster_id", roasterId)
        .eq("is_active", true)
        .order("name")
        .limit(50),
      supabase
        .from("roasted_stock")
        .select("id, name, current_stock_kg, green_beans(name)")
        .eq("roaster_id", roasterId)
        .eq("is_active", true)
        .order("name")
        .limit(50),
      supabase
        .from("wholesale_access")
        .select("id, business_name, status, payment_terms, price_tier, users(email)")
        .eq("roaster_id", roasterId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("discount_codes")
        .select("id, code, discount_type, discount_value, status")
        .eq("roaster_id", roasterId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const lines: string[] = [
    "ROASTER ACCOUNT CONTEXT (use these real IDs when building plans):",
    "",
  ];

  // Products
  const p = products.data || [];
  lines.push(`Products (${p.length}):`);
  for (const item of p) {
    const prices = [
      item.retail_price ? `retail £${item.retail_price}` : null,
      item.wholesale_price ? `wholesale £${item.wholesale_price}` : null,
      !item.retail_price && !item.wholesale_price && item.price ? `£${item.price}` : null,
    ].filter(Boolean).join(", ");
    lines.push(`- ${item.name} [${item.id}] ${prices ? `(${prices})` : ""} [${item.status}]`);
  }

  // Contacts
  const c = contacts.data || [];
  lines.push(`\nContacts (${c.length}):`);
  for (const item of c) {
    const name = `${item.first_name} ${item.last_name}`.trim();
    lines.push(`- ${name} [${item.id}] ${item.email || ""} ${item.business_name ? `(${item.business_name})` : ""}`);
  }

  // Green beans
  const gb = greenBeans.data || [];
  lines.push(`\nGreen Beans (${gb.length}):`);
  for (const item of gb) {
    lines.push(`- ${item.name} [${item.id}] ${item.current_stock_kg}kg`);
  }

  // Roasted stock
  const rs = roastedStock.data || [];
  lines.push(`\nRoasted Stock (${rs.length}):`);
  for (const item of rs) {
    const greenName = (item.green_beans as { name: string } | null)?.name;
    lines.push(`- ${item.name} [${item.id}] ${item.current_stock_kg}kg${greenName ? ` (from ${greenName})` : ""}`);
  }

  // Wholesale buyers
  const wb = buyers.data || [];
  lines.push(`\nWholesale Buyers (${wb.length}):`);
  for (const item of wb) {
    const email = (item.users as { email: string } | null)?.email;
    const terms = item.payment_terms ? ` terms:${item.payment_terms}` : "";
    const tier = item.price_tier ? ` tier:${item.price_tier}` : "";
    lines.push(`- ${item.business_name || "Unknown"} [${item.id}] ${email || ""} [${item.status}]${terms}${tier}`);
  }

  // Discount codes
  const dc = discountCodes.data || [];
  lines.push(`\nActive Discount Codes (${dc.length}):`);
  for (const item of dc) {
    const val = item.discount_type === "percentage"
      ? `${item.discount_value}%`
      : `£${item.discount_value}`;
    lines.push(`- ${item.code} [${item.id}] ${val}`);
  }

  return lines.join("\n");
}

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

// ── Strip formatting tags from history ──
// Removes ENTITY, CHIPS, and PICKER tags from assistant messages to reduce noise

function stripFormattingTags(text: string): string {
  // Replace ENTITY:{"type":"product","id":"uuid","name":"Name","detail":"detail"} with just the name
  let cleaned = text.replace(/ENTITY:\{[^}]*?"name"\s*:\s*"([^"]*)"[^}]*\}/g, "$1");
  // Remove CHIPS:[...] tags entirely
  cleaned = cleaned.replace(/CHIPS:\[[\s\S]*?\](?:\s*$)?/g, "").trim();
  // Remove PICKER:{...} tags entirely — these can be multi-level JSON
  cleaned = cleaned.replace(/PICKER:\{[\s\S]*\}(?:\s*$)?/g, "").trim();
  return cleaned;
}

// ── Extract conversation state from history ──
// Scans previous messages for confirmed facts (entities, values) to prevent Gemini
// from contradicting itself or re-asking questions already answered.

function extractConversationState(history: Array<{ role: string; content: string }>): string {
  const facts: string[] = [];
  const seenContacts = new Map<string, { name: string; id: string; email?: string }>();
  const seenProducts = new Map<string, { name: string; id: string }>();
  const confirmedValues: string[] = [];

  for (const msg of history) {
    // Extract ENTITY tags from assistant messages
    if (msg.role === "assistant" || msg.role === "model") {
      const entityMatches = msg.content.matchAll(/ENTITY:\{([^}]*)\}/g);
      for (const match of entityMatches) {
        try {
          const entity = JSON.parse(`{${match[1]}}`);
          if (entity.type === "contact" && entity.id && entity.name) {
            seenContacts.set(entity.id, {
              name: entity.name,
              id: entity.id,
              email: entity.detail || undefined,
            });
          }
          if (entity.type === "product" && entity.id && entity.name) {
            seenProducts.set(entity.id, { name: entity.name, id: entity.id });
          }
        } catch {
          // Malformed entity — skip
        }
      }
    }

    // Extract confirmed values from user messages (simple heuristics)
    if (msg.role === "user") {
      const lower = msg.content.toLowerCase();
      // Payment terms
      if (/\bnet\s*7\b/i.test(msg.content)) confirmedValues.push("Payment terms: net7");
      else if (/\bnet\s*14\b/i.test(msg.content)) confirmedValues.push("Payment terms: net14");
      else if (/\bnet\s*30\b/i.test(msg.content)) confirmedValues.push("Payment terms: net30");

      // Confirmations like "yes", "that's right", "correct", "go ahead"
      if (/^(yes|yeah|yep|correct|that'?s right|confirmed?|go ahead|proceed)\b/i.test(lower.trim())) {
        // The user confirmed whatever was last proposed — we don't need to track specifics,
        // the entities already captured cover it
      }
    }
  }

  // Build the state block
  for (const [, contact] of seenContacts) {
    facts.push(`- Contact: ${contact.name}${contact.email ? ` (${contact.email})` : ""} — ID: ${contact.id} — already confirmed`);
  }
  for (const [, product] of seenProducts) {
    facts.push(`- Product: ${product.name} — ID: ${product.id} — already confirmed`);
  }
  // Deduplicate confirmed values
  for (const val of Array.from(new Set(confirmedValues))) {
    facts.push(`- ${val} — already confirmed by user`);
  }

  if (facts.length === 0) return "";

  return `CONVERSATION STATE — facts already established, do not ask again:\n${facts.join("\n")}`;
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
    const { message, history, file } = await request.json() as {
      message: string;
      history?: Array<{ role: string; content: string }>;
      file?: { name: string; mimeType: string; data: string; isText?: boolean };
    };
    if ((!message || typeof message !== "string") && !file) {
      return Response.json({ error: "Message or file is required" }, { status: 400 });
    }

    // Always inject fresh roaster context on every request
    let systemPrompt = BASE_SYSTEM_PROMPT;
    try {
      const context = await fetchRoasterContext(roasterId);
      systemPrompt = context + "\n\n" + BASE_SYSTEM_PROMPT;
    } catch {
      // Context fetch failed — proceed without it
    }

    // Extract conversation state and inject above everything when history has substance
    if (history && Array.isArray(history) && history.length > 2) {
      const conversationState = extractConversationState(history);
      if (conversationState) {
        systemPrompt = conversationState + "\n\n" + systemPrompt;
      }
    }

    const ai = new GoogleGenAI({ apiKey });

    type Part = {
      text?: string;
      inlineData?: { data: string; mimeType: string };
      functionCall?: { name: string; args: Record<string, unknown> };
      functionResponse?: { name: string; response: Record<string, unknown> };
    };

    const contents: Array<{
      role: "user" | "model";
      parts: Part[];
    }> = [];

    // Rebuild conversation history — strip formatting tags from assistant messages
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        const cleanedContent = msg.role === "user"
          ? msg.content
          : stripFormattingTags(msg.content);
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: cleanedContent }],
        });
      }
    }

    // Build user message parts (possibly multimodal with file)
    const userParts: Part[] = [];
    const textContent = message || (file ? `Please analyze this file: ${file.name}` : "");

    if (file) {
      if (file.isText) {
        // Text files (CSV, XLSX converted to CSV): prepend to message text
        userParts.push({ text: `[Document: ${file.name}]\n${file.data}\n\n${textContent}` });
      } else {
        // Binary files (PDF, DOCX, images): text + inlineData
        userParts.push({ text: textContent });
        userParts.push({ inlineData: { data: file.data, mimeType: file.mimeType } });
      }
    } else {
      userParts.push({ text: textContent });
    }

    contents.push({ role: "user", parts: userParts });

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
                systemInstruction: systemPrompt,
                tools: [{ functionDeclarations: readToolDeclarations }],
              },
            });

            const functionCalls = response.functionCalls;

            if (!functionCalls || functionCalls.length === 0) {
              // Model returned text — could be JSON plan or conversational message
              const text = response.text || "";

              // Try to parse a plan from the response.
              // Gemini may return: pure JSON, JSON in ```json fences,
              // or prose followed by JSON.
              let plan;
              let preText = "";

              // 1. Strip ```json ... ``` code fences if present
              const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
              const jsonCandidate = fenceMatch ? fenceMatch[1].trim() : text.trim();

              // If there was prose before the code fence, capture it
              if (fenceMatch) {
                const fenceStart = text.indexOf(fenceMatch[0]);
                preText = text.slice(0, fenceStart).trim();
              }

              // 2. Try parsing the candidate directly
              try {
                plan = JSON.parse(jsonCandidate);
              } catch {
                // 3. Try extracting the outermost JSON object
                // Find the first { and last } to handle prose around JSON
                const firstBrace = jsonCandidate.indexOf("{");
                const lastBrace = jsonCandidate.lastIndexOf("}");
                if (firstBrace !== -1 && lastBrace > firstBrace) {
                  if (!preText && firstBrace > 0) {
                    preText = jsonCandidate.slice(0, firstBrace).trim();
                  }
                  try {
                    plan = JSON.parse(jsonCandidate.slice(firstBrace, lastBrace + 1));
                  } catch {
                    // Not valid JSON
                  }
                }
              }

              if (plan?.plan && Array.isArray(plan.plan)) {
                // If there was a preamble (e.g. "Here's what I'll do:"), send it as a message
                if (preText) {
                  send("message", { text: preText });
                }
                // Stream each action as a separate event
                for (const action of plan.plan) {
                  send("action", action);
                }
                send("summary", { text: plan.summary || "" });
              } else {
                // Model returned prose — send as message
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
