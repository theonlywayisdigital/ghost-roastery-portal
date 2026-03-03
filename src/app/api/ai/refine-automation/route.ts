import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

const MAX_DAILY_GENERATIONS = 20;

interface RefineAutomationRequest {
  instruction: string;
  automation: {
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
  };
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

  let body: RefineAutomationRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.instruction?.trim()) {
    return NextResponse.json({ error: "Instruction is required" }, { status: 400 });
  }

  if (!body.automation) {
    return NextResponse.json({ error: "Current automation is required" }, { status: 400 });
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

  // Fetch minimal context
  const [discountCodesRes, productsRes] = await Promise.all([
    supabase.from("discount_codes").select("code, discount_type, discount_value").eq("roaster_id", roaster.id).in("status", ["active", "paused"]).limit(10),
    supabase.from("wholesale_products").select("id, name, retail_price").eq("roaster_id", roaster.id).eq("status", "active").limit(20),
  ]);

  const system = `You are an expert marketing automation editor for a specialty coffee roaster called "${roaster.business_name}".

You will receive the CURRENT automation structure and a REFINEMENT INSTRUCTION from the user.

Your task: Apply the requested changes and return the COMPLETE updated automation in the exact same JSON format.

IMPORTANT RULES:
- Only change what the user asks for. Keep everything else exactly the same.
- If the user says "make emails shorter", shorten the email content blocks but keep trigger, delays, conditions unchanged.
- If the user says "add a discount code", only modify the relevant email steps to include the discount_code block.
- If the user says "change to 4 weeks instead of 6", adjust the number of steps and delays accordingly.
- If adding a condition, insert it at a logical point in the sequence.
- Preserve all existing block IDs in email content where blocks are unchanged.
- For new blocks, do NOT include "id" fields.
- Return ONLY valid JSON — the complete updated automation. No explanation.

## Available discount codes:
${(discountCodesRes.data || []).map(d => `${d.code} (${d.discount_type === "percentage" ? `${d.discount_value}%` : d.discount_type === "fixed_amount" ? `£${d.discount_value}` : "free shipping"})`).join(", ") || "None"}

## Available products:
${(productsRes.data || []).map(p => `${p.name}${p.retail_price ? ` (£${p.retail_price})` : ""} [${p.id}]`).join(", ") || "None"}

## Return format (same as input):
{
  "name": "...",
  "description": "...",
  "trigger": { "trigger_type": "...", "trigger_config": {...}, "trigger_filters": {...} },
  "steps": [...],
  "notes": ["Explanation of what was changed"]
}`;

  // Summarize current automation for the prompt (strip block content to save tokens)
  const summarySteps = body.automation.steps.map((s, i) => {
    if (s.step_type === "email") {
      const blocks = (s.config.content as Array<{ type: string; data: Record<string, unknown> }>) || [];
      return {
        step_index: i,
        step_type: "email",
        config: {
          subject: s.config.subject,
          preview_text: s.config.preview_text,
          from_name: s.config.from_name,
          email_bg_color: s.config.email_bg_color,
          content: blocks,
        },
      };
    }
    return { step_index: i, ...s };
  });

  const user = `CURRENT AUTOMATION:
${JSON.stringify({ ...body.automation, steps: summarySteps }, null, 2)}

REFINEMENT INSTRUCTION: ${body.instruction}`;

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

    let parsed: {
      name: string;
      description: string;
      trigger: {
        trigger_type: string;
        trigger_config: Record<string, unknown>;
        trigger_filters?: { groups: Array<{ id?: string; conditions: Array<{ id?: string; field: string; operator: string; value: unknown }> }> };
      };
      steps: Array<{ step_type: string; config: Record<string, unknown> }>;
      notes?: string[];
    };

    try {
      parsed = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        console.error("Failed to parse AI refinement response:", text.slice(0, 500));
        return NextResponse.json({ error: "AI returned invalid format. Please try again." }, { status: 500 });
      }
    }

    // Add IDs to new email blocks that don't have them
    for (const step of parsed.steps) {
      if (step.step_type === "email" && Array.isArray(step.config.content)) {
        step.config.content = (step.config.content as Array<{ id?: string; type: string; data: Record<string, unknown> }>).map(block => ({
          ...block,
          id: block.id || Math.random().toString(36).slice(2, 8),
        }));
      }
    }

    // Add IDs to filter groups/conditions
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
        name: parsed.name || body.automation.name,
        description: parsed.description || body.automation.description,
        trigger: parsed.trigger || body.automation.trigger,
        steps: parsed.steps || body.automation.steps,
        notes: parsed.notes || [],
      },
      usage: { used: generationsToday + 1, limit: MAX_DAILY_GENERATIONS },
    });
  } catch (err) {
    console.error("AI automation refinement error:", err);
    return NextResponse.json({ error: "Failed to refine automation. Please try again." }, { status: 500 });
  }
}
