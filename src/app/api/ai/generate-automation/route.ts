import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { getPrimaryTriggers } from "@/lib/trigger-definitions";

const MAX_DAILY_GENERATIONS = 20;

interface GenerateAutomationRequest {
  brief: string;
  tone?: "professional" | "friendly" | "casual" | "urgent" | "luxury";
  discount_code_id?: string;
  product_ids?: string[];
  audience_hints?: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI generation is not configured" }, { status: 503 });
  }

  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: GenerateAutomationRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.brief?.trim()) {
    return NextResponse.json({ error: "Brief is required" }, { status: 400 });
  }

  // Rate limiting
  const supabase = createServerClient();
  const now = new Date();
  let generationsToday = (roaster as Record<string, unknown>).ai_generations_today as number || 0;
  const resetAt = (roaster as Record<string, unknown>).ai_generation_reset_at as string | null;

  if (!resetAt || new Date(resetAt) < now) {
    generationsToday = 0;
    const tomorrow = new Date(now);
    tomorrow.setUTCHours(0, 0, 0, 0);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    await supabase
      .from("partner_roasters")
      .update({ ai_generations_today: 0, ai_generation_reset_at: tomorrow.toISOString() })
      .eq("id", roaster.id);
  }

  if (generationsToday >= MAX_DAILY_GENERATIONS) {
    return NextResponse.json(
      { error: `Daily limit reached (${MAX_DAILY_GENERATIONS} generations). Resets at midnight UTC.`, rate_limited: true },
      { status: 429 }
    );
  }

  // ── Gather roaster context ──────────────────────────────────
  const [productsRes, discountCodesRes, formsRes, contactTypesRes, existingAutosRes] = await Promise.all([
    supabase.from("products").select("id, name, description, retail_price").eq("roaster_id", roaster.id).eq("status", "active").limit(30),
    supabase.from("discount_codes").select("id, code, description, discount_type, discount_value").eq("roaster_id", roaster.id).in("status", ["active", "paused"]).limit(20),
    supabase.from("forms").select("id, name").eq("roaster_id", roaster.id).eq("status", "active"),
    supabase.from("contacts").select("types, source").eq("roaster_id", roaster.id).neq("status", "archived").limit(500),
    supabase.from("automations").select("name, trigger_type").eq("roaster_id", roaster.id).eq("is_template", false).limit(20),
  ]);

  const products = productsRes.data || [];
  const discountCodes = discountCodesRes.data || [];
  const forms = formsRes.data || [];
  const existingAutos = existingAutosRes.data || [];

  // Extract unique contact types and sources
  const contactTypes = new Set<string>();
  const contactSources = new Set<string>();
  for (const c of contactTypesRes.data || []) {
    for (const t of ((c.types as string[]) || [])) contactTypes.add(t);
    if (c.source) contactSources.add(c.source as string);
  }

  // Build product context
  let productContext = "";
  if (body.product_ids?.length) {
    const featured = products.filter(p => body.product_ids!.includes(p.id));
    if (featured.length) {
      productContext = `\n\nProducts to feature in emails:\n${featured.map(p =>
        `- ${p.name}${p.description ? `: ${p.description}` : ""}${p.retail_price ? ` (£${p.retail_price})` : ""} [ID: ${p.id}]`
      ).join("\n")}`;
    }
  }

  // Build discount context
  let discountContext = "";
  if (body.discount_code_id) {
    const discount = discountCodes.find(d => d.id === body.discount_code_id);
    if (discount) {
      const discountLabel = discount.discount_type === "percentage"
        ? `${discount.discount_value}% off`
        : discount.discount_type === "fixed_amount"
          ? `£${discount.discount_value} off`
          : "Free shipping";
      discountContext = `\n\nDiscount code to include: ${discount.code} (${discountLabel})${discount.description ? ` — ${discount.description}` : ""}`;
    }
  }

  // Build trigger definitions context
  const triggers = getPrimaryTriggers();
  const triggerDefs = triggers.map(t => ({
    type: t.type,
    label: t.label,
    description: t.description,
    configFields: t.configFields?.map(f => ({ key: f.key, label: f.label, type: f.type })),
  }));

  const toneGuide: Record<string, string> = {
    professional: "Professional and authoritative. Clean, corporate-friendly language.",
    friendly: "Warm and approachable. Conversational but not sloppy.",
    casual: "Relaxed and fun. Short sentences, informal language.",
    urgent: "Create urgency and FOMO. Action-oriented, time-sensitive language.",
    luxury: "Premium and aspirational. Elegant, sophisticated word choices.",
  };

  const tone = body.tone || "friendly";

  // ── Build system prompt ──────────────────────────────────
  const system = `You are an expert marketing automation architect for a specialty coffee roaster called "${roaster.business_name}".

Your task is to generate a COMPLETE marketing automation — trigger, steps (emails with full content, delays, conditions), and filters — based on the user's description.

Return a JSON object with this EXACT structure:
{
  "name": "Short automation name",
  "description": "1-2 sentence description of what this automation does",
  "trigger": {
    "trigger_type": "one of the valid trigger types",
    "trigger_config": { /* trigger-specific config */ },
    "trigger_filters": { "groups": [] }
  },
  "steps": [
    {
      "step_type": "email",
      "config": {
        "subject": "Subject line",
        "from_name": "",
        "preview_text": "Preview text",
        "content": [ /* email blocks array */ ],
        "email_bg_color": "#f8fafc"
      }
    },
    {
      "step_type": "delay",
      "config": { "delay_days": 3, "delay_hours": 0 }
    },
    {
      "step_type": "condition",
      "config": { "field": "opened_previous", "value": true }
    }
  ],
  "notes": ["Any notes for the user, e.g. 'I set this to trigger from your Contact Form — change if you meant a different form'"]
}

## Available trigger types:
${JSON.stringify(triggerDefs, null, 2)}

## Trigger config examples:
- form_submitted: { "form_id": "uuid" } — leave empty string if any form
- contact_created: { "source": "website" } — leave empty if any source
- no_activity: { "days_inactive": 60 }
- date_based: { "date_field": "birthday", "days_before": 0 }
- order_placed: {} — no config needed
- custom_webhook: {} — no config needed
- email_engagement: { "engagement_type": "opened", "campaign_id": "" }

## Available filter fields for trigger_filters groups:
Each group has conditions that are OR'd. Groups are AND'd together.
Filter condition format: { "id": "random", "field": "contact.types", "operator": "equals", "value": "retail" }
Valid fields: contact.types, contact.status, contact.lead_status, contact.source, contact.total_spend, contact.order_count, contact.email, contact.business_name
Valid operators: equals, not_equals, contains, not_contains, greater_than, less_than, is_set, is_not_set, in, not_in

## Email block types for the "content" array:

1. Header: {"type": "header", "data": {"text": "Heading", "level": 1, "align": "center"}}
2. Text: {"type": "text", "data": {"html": "<p>Paragraph with <strong>bold</strong> and <em>italic</em>.</p>"}}
3. Button: {"type": "button", "data": {"text": "CTA Label", "url": "", "align": "center", "style": "filled", "borderRadius": 8}}
4. Image: {"type": "image", "data": {"src": "", "alt": "Image description", "align": "center"}}
5. Divider: {"type": "divider", "data": {}}
6. Spacer: {"type": "spacer", "data": {"height": 24}}
7. Product grid: {"type": "product_grid", "data": {"productIds": ["id1"], "columns": 2}}
8. Discount code: {"type": "discount_code", "data": {"code": "CODE", "description": "Description", "style": "card"}}
9. Footer: {"type": "footer", "data": {"text": "${roaster.business_name}"}}

## Tone: ${toneGuide[tone]}

## Roaster context:
- Business name: ${roaster.business_name}
- Products: ${products.length > 0 ? products.map(p => `${p.name}${p.retail_price ? ` (£${p.retail_price})` : ""}`).join(", ") : "No products listed yet"}
- Active discount codes: ${discountCodes.length > 0 ? discountCodes.map(d => `${d.code} (${d.discount_type === "percentage" ? `${d.discount_value}%` : d.discount_type === "fixed_amount" ? `£${d.discount_value}` : "free shipping"})`).join(", ") : "None"}
- Forms: ${forms.length > 0 ? forms.map(f => `${f.name} [${f.id}]`).join(", ") : "None"}
- Contact types: ${contactTypes.size > 0 ? Array.from(contactTypes).join(", ") : "Not set up yet"}
- Contact sources: ${contactSources.size > 0 ? Array.from(contactSources).join(", ") : "Not tracked yet"}
- Existing automations: ${existingAutos.length > 0 ? existingAutos.map(a => a.name).join(", ") : "None yet"}

## RULES:
- Generate realistic, usable email content — NOT placeholder lorem ipsum. Reference the actual business name and products.
- Each email should have 4-7 content blocks (not counting spacers/dividers).
- Start each email with a header, include body text, end with a CTA button and footer.
- Use spacer blocks (height 16-32) between content sections.
- Space emails with sensible delays (1-7 days typically).
- Add conditions where appropriate (e.g. stop if customer orders, check if previous email was opened).
- Use "" for button URLs (user will fill in their actual storefront URL).
- Do NOT include "id" fields in blocks — those are added automatically.
- If you reference a form, use the actual form ID from the context above if available.
- If referencing a discount code, use the actual code from context.
- If you can't determine something (like which form), pick the most reasonable option and add a note explaining your choice.
- Return ONLY valid JSON. No markdown fences, no explanation, no commentary.${productContext}${discountContext}${body.audience_hints ? `\n\nAudience context: ${body.audience_hints}` : ""}`;

  const user = `Build a complete marketing automation for: ${body.brief}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: user,
      config: {
        systemInstruction: system,
        maxOutputTokens: 16384,
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Parse JSON
    let parsed: {
      name: string;
      description: string;
      trigger: {
        trigger_type: string;
        trigger_config: Record<string, unknown>;
        trigger_filters?: { groups: Array<{ id?: string; conditions: Array<{ id?: string; field: string; operator: string; value: unknown }> }> };
      };
      steps: Array<{
        step_type: string;
        config: Record<string, unknown>;
      }>;
      notes?: string[];
    };

    try {
      parsed = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        console.error("Failed to parse AI automation response:", text.slice(0, 500));
        return NextResponse.json({ error: "AI returned invalid format. Please try again." }, { status: 500 });
      }
    }

    // Add IDs to email blocks and filter conditions
    for (const step of parsed.steps) {
      if (step.step_type === "email" && Array.isArray(step.config.content)) {
        step.config.content = (step.config.content as Array<{ type: string; data: Record<string, unknown> }>).map(block => ({
          ...block,
          id: Math.random().toString(36).slice(2, 8),
        }));
      }
    }

    // Add IDs to filter groups and conditions
    if (parsed.trigger.trigger_filters?.groups) {
      for (const group of parsed.trigger.trigger_filters.groups) {
        if (!group.id) group.id = Math.random().toString(36).slice(2, 8);
        for (const cond of group.conditions) {
          if (!cond.id) cond.id = Math.random().toString(36).slice(2, 8);
        }
      }
    }

    // Increment usage
    await supabase
      .from("partner_roasters")
      .update({ ai_generations_today: generationsToday + 1 })
      .eq("id", roaster.id);

    return NextResponse.json({
      automation: {
        name: parsed.name || "AI-Generated Automation",
        description: parsed.description || "",
        trigger: parsed.trigger,
        steps: parsed.steps,
        notes: parsed.notes || [],
      },
      usage: { used: generationsToday + 1, limit: MAX_DAILY_GENERATIONS },
    });
  } catch (err) {
    console.error("AI automation generation error:", err);
    return NextResponse.json({ error: "Failed to generate automation. Please try again." }, { status: 500 });
  }
}
