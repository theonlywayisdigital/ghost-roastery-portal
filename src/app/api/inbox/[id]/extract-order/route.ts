import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { checkFeature } from "@/lib/feature-gates";
import { checkAiCredits, consumeAiCredits } from "@/lib/ai-credits";

/**
 * POST /api/inbox/[id]/extract-order
 *
 * Uses AI to extract structured order data from an inbox email.
 * Fetches the roaster's products and contacts as context so the AI
 * can match names to real database records.
 */

interface RouteContext {
  params: Promise<{ id: string }>;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(request: NextRequest, context: RouteContext) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roasterId = user.roaster.id;

  // Feature gate: order extraction requires Starter+
  const featureCheck = await checkFeature(roasterId, "orderExtraction");
  if (!featureCheck.allowed) {
    return NextResponse.json(
      { error: featureCheck.message },
      { status: 403 }
    );
  }

  // Credit check: 2 credits per extraction
  const creditCheck = await checkAiCredits(roasterId, "extract_order");
  if (!creditCheck.allowed) {
    return NextResponse.json(
      { error: creditCheck.message, rate_limited: true, upgrade_required: true },
      { status: 429 }
    );
  }

  const { id: messageId } = await context.params;
  const supabase = createServerClient();

  // ── Fetch inbox message ──
  const { data: message, error: msgErr } = await supabase
    .from("inbox_messages")
    .select("*")
    .eq("id", messageId)
    .eq("roaster_id", roasterId)
    .single();

  if (msgErr || !message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  // Get plain text email content
  const emailBody = message.body_text || (message.body_html ? stripHtml(message.body_html) : "");
  if (!emailBody.trim()) {
    return NextResponse.json({
      extraction: {
        customer: { name: message.from_name || "", email: message.from_email, business_name: null, matched_contact_id: null },
        items: [],
        delivery_notes: null,
        order_channel: "wholesale",
        confidence: "low",
        raw_notes: "Email body is empty — no order content found.",
      },
    });
  }

  // ── Fetch roaster's published products with variants ──
  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, unit, retail_price, wholesale_price, product_variants(id, weight_grams, unit, retail_price, wholesale_price, channel, is_active)")
    .eq("roaster_id", roasterId)
    .eq("status", "published");

  const productCatalog = (products || []).map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    unit: p.unit,
    retail_price: p.retail_price,
    wholesale_price: p.wholesale_price,
    variants: (p.product_variants || [])
      .filter((v: { is_active: boolean }) => v.is_active)
      .map((v: { id: string; weight_grams: number | null; unit: string | null; retail_price: number | null; wholesale_price: number | null; channel: string | null }) => ({
        id: v.id,
        weight_grams: v.weight_grams,
        unit: v.unit,
        retail_price: v.retail_price,
        wholesale_price: v.wholesale_price,
        channel: v.channel,
      })),
  }));

  // ── Fetch roaster's contacts ──
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email, business_name")
    .eq("roaster_id", roasterId)
    .eq("status", "active")
    .limit(500);

  const contactList = (contacts || []).map((c) => ({
    id: c.id,
    name: `${c.first_name} ${c.last_name}`.trim(),
    email: c.email,
    business_name: c.business_name,
  }));

  // ── Build AI prompt ──
  const systemPrompt = `You are an AI assistant that extracts order details from emails sent to coffee roasters. You will be given an email body, a product catalogue, and a contacts list. Your job is to extract structured order information.

Return ONLY valid JSON with this exact structure (no markdown, no code fences):
{
  "customer": {
    "name": "string or null",
    "email": "string or null",
    "business_name": "string or null",
    "matched_contact_id": "uuid or null (from contacts list)"
  },
  "items": [
    {
      "product_name": "string (what was mentioned in the email)",
      "matched_product_id": "uuid or null (from catalogue)",
      "variant_description": "string or null (e.g. '1kg', '250g')",
      "matched_variant_id": "uuid or null (from catalogue)",
      "quantity": number,
      "notes": "string or null"
    }
  ],
  "delivery_notes": "string or null",
  "order_channel": "wholesale" or "retail",
  "confidence": "high", "medium", or "low",
  "raw_notes": "string or null (anything you couldn't parse but might be relevant)"
}

Rules:
- Match customer name/email to the contacts list. If the sender matches a contact, use that contact's ID.
- Match product names to the catalogue using fuzzy matching. Coffee names may be abbreviated.
- If a weight/size is mentioned (e.g. "1kg", "250g"), try to match it to a variant.
- Default quantity to 1 if not specified.
- Infer order_channel: trade accounts, wholesale pricing, bulk quantities, business names = "wholesale". Individual/personal orders = "retail". Default to "wholesale".
- Set confidence: "high" if customer and at least one product clearly matched. "medium" if partial matches. "low" if no recognisable order content.
- Put anything ambiguous or unmatched in raw_notes.
- If the email is not an order at all (just general conversation, inquiry, etc.), return empty items and low confidence.`;

  const userPrompt = `EMAIL:
From: ${message.from_name ? `${message.from_name} <${message.from_email}>` : message.from_email}
Subject: ${message.subject || "(No subject)"}
Body:
${emailBody}

PRODUCT CATALOGUE:
${JSON.stringify(productCatalog, null, 2)}

CONTACTS LIST:
${JSON.stringify(contactList, null, 2)}

Extract the order details from this email.`;

  // ── Call AI ──
  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 2048,
        temperature: 0.1,
      },
    });

    const text = response.text?.trim() || "";

    // Parse JSON from response (may be wrapped in code fences)
    let jsonStr = text;
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }

    let extraction;
    try {
      extraction = JSON.parse(jsonStr);
    } catch {
      console.error("[extract-order] Failed to parse AI response:", text);
      return NextResponse.json({
        extraction: {
          customer: { name: message.from_name || "", email: message.from_email, business_name: null, matched_contact_id: null },
          items: [],
          delivery_notes: null,
          order_channel: "wholesale",
          confidence: "low",
          raw_notes: `AI returned unparseable response. Raw email subject: "${message.subject}"`,
        },
      });
    }

    // Ensure required structure
    if (!extraction.customer) {
      extraction.customer = { name: message.from_name, email: message.from_email, business_name: null, matched_contact_id: null };
    }
    if (!extraction.items) extraction.items = [];
    if (!extraction.confidence) extraction.confidence = "low";

    // Consume credits after successful extraction
    await consumeAiCredits(roasterId, "extract_order", { messageId });

    return NextResponse.json({ extraction, messageId });
  } catch (err) {
    console.error("[extract-order] AI call failed:", err);
    return NextResponse.json(
      { error: "AI extraction failed. Please try again." },
      { status: 500 }
    );
  }
}
