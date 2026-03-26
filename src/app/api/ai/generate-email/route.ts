import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { checkAiCredits, consumeAiCredits } from "@/lib/ai-credits";

interface GenerateEmailRequest {
  brief: string;
  tone: "professional" | "friendly" | "casual" | "urgent" | "luxury";
  length: "short" | "medium" | "long";
  includeProducts?: boolean;
  productIds?: string[];
  includeDiscount?: boolean;
  discountCodeId?: string;
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

  let body: GenerateEmailRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.brief?.trim()) {
    return NextResponse.json({ error: "Brief is required" }, { status: 400 });
  }

  // Credit check
  const creditCheck = await checkAiCredits(roaster.id as string, "generate_email");
  if (!creditCheck.allowed) {
    return NextResponse.json(
      { error: creditCheck.message, rate_limited: true, upgrade_required: true },
      { status: 429 }
    );
  }

  // Fetch products if requested
  const supabase = createServerClient();
  let productContext = "";
  if (body.includeProducts && body.productIds?.length) {
    const { data: products } = await supabase
      .from("products")
      .select("id, name, description, retail_price, wholesale_price")
      .eq("roaster_id", roaster.id)
      .in("id", body.productIds);
    if (products?.length) {
      productContext = `\n\nProducts to feature:\n${products.map((p: Record<string, unknown>) =>
        `- ${p.name}${p.description ? `: ${p.description}` : ""}${p.retail_price ? ` (£${p.retail_price})` : ""}`
      ).join("\n")}`;
    }
  }

  // Fetch discount code if requested
  let discountContext = "";
  if (body.includeDiscount && body.discountCodeId) {
    const { data: discount } = await supabase
      .from("discount_codes")
      .select("code, description, discount_type, discount_value")
      .eq("id", body.discountCodeId)
      .eq("roaster_id", roaster.id)
      .single();
    if (discount) {
      const discountLabel = discount.discount_type === "percentage"
        ? `${discount.discount_value}% off`
        : discount.discount_type === "fixed_amount"
          ? `£${discount.discount_value} off`
          : "Free shipping";
      discountContext = `\n\nDiscount code to include: ${discount.code} (${discountLabel})${discount.description ? ` — ${discount.description}` : ""}`;
    }
  }

  const blockCount = body.length === "short" ? "3-4" : body.length === "medium" ? "5-7" : "8-10";

  const toneGuide: Record<string, string> = {
    professional: "Professional and authoritative. Clean, corporate-friendly language.",
    friendly: "Warm and approachable. Conversational but not sloppy.",
    casual: "Relaxed and fun. Short sentences, informal language.",
    urgent: "Create urgency and FOMO. Action-oriented, time-sensitive language.",
    luxury: "Premium and aspirational. Elegant, sophisticated word choices.",
  };

  const system = `You are an expert email marketing copywriter for a specialty coffee roaster called "${roaster.business_name}".

Your task is to generate a complete email as a JSON object with this EXACT structure:
{
  "subject": "The email subject line (under 60 chars)",
  "preview_text": "Preview text for inbox (under 100 chars)",
  "blocks": [
    // Array of email editor blocks
  ]
}

Each block in the "blocks" array must be one of these types:

1. Header block:
   {"type": "header", "data": {"text": "Heading text", "level": 1, "align": "center"}}
   level can be 1, 2, or 3. Use level 1 for the main heading, level 2 for section headings.

2. Text block:
   {"type": "text", "data": {"html": "<p>Paragraph text with <strong>bold</strong> and <em>italic</em> support.</p>"}}
   Use proper HTML: <p>, <strong>, <em>, <a href>. Keep paragraphs concise.

3. Button block:
   {"type": "button", "data": {"text": "Button Label", "url": "https://example.com", "align": "center", "style": "filled"}}

4. Image block (use as a placeholder suggestion):
   {"type": "image", "data": {"src": "", "alt": "Description of suggested image", "align": "center"}}

5. Divider block:
   {"type": "divider", "data": {}}

6. Spacer block:
   {"type": "spacer", "data": {"height": 24}}

7. Product grid block (only if products are provided):
   {"type": "product_grid", "data": {"productIds": ["id1", "id2"], "columns": 2}}

8. Discount code block (only if a discount code is provided):
   {"type": "discount_code", "data": {"code": "CODE", "description": "Description of the offer", "style": "card"}}

9. Footer block:
   {"type": "footer", "data": {"text": "Footer text", "align": "center"}}

RULES:
- Generate ${blockCount} content blocks (not counting spacers/dividers)
- Tone: ${toneGuide[body.tone] || toneGuide.professional}
- Start with a compelling header, follow with body text, end with a clear CTA button and footer
- Use spacer blocks (height 16-32) between sections for breathing room
- Do NOT include "id" fields — those will be added automatically
- Return ONLY valid JSON. No markdown fences, no explanation, no commentary.
- The JSON must be parseable by JSON.parse() directly.`;

  const user = `Write a complete marketing email about: ${body.brief}${productContext}${discountContext}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: user,
      config: {
        systemInstruction: system,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Parse the JSON response
    let parsed: { subject: string; preview_text: string; blocks: Array<{ type: string; data: Record<string, unknown> }> };
    try {
      parsed = JSON.parse(text);
    } catch {
      // Try to extract JSON from potential markdown fences
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        console.error("Failed to parse AI email response:", text.slice(0, 500));
        return NextResponse.json({ error: "AI returned invalid format. Please try again." }, { status: 500 });
      }
    }

    // Add IDs to blocks
    const blocks = (parsed.blocks || []).map((block: { type: string; data: Record<string, unknown> }) => ({
      ...block,
      id: Math.random().toString(36).slice(2, 8),
    }));

    // Consume credits
    await consumeAiCredits(roaster.id as string, "generate_email");

    return NextResponse.json({
      subject: parsed.subject || "",
      preview_text: parsed.preview_text || "",
      blocks,
    });
  } catch (err) {
    console.error("AI email generation error:", err);
    return NextResponse.json({ error: "Failed to generate email. Please try again." }, { status: 500 });
  }
}
