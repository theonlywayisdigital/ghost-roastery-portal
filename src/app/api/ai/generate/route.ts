import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { buildPrompt, type GenerationType } from "@/lib/ai-prompts";
import { checkLimit } from "@/lib/feature-gates";

export async function POST(req: NextRequest) {
  // Check API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI generation is not configured" },
      { status: 503 }
    );
  }

  // Auth
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  let body: { type: GenerationType; context?: Record<string, unknown>; prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, context = {}, prompt: userPrompt = "" } = body;
  if (!type) {
    return NextResponse.json({ error: "Missing 'type' field" }, { status: 400 });
  }

  // Check monthly AI credit limit (tier-based)
  const limitCheck = await checkLimit(roaster.id as string, "aiCreditsPerMonth", 1);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      {
        error: limitCheck.message,
        rate_limited: true,
        upgrade_required: true,
      },
      { status: 429 }
    );
  }

  const supabase = createServerClient();

  // Build prompt
  const promptContext = {
    roasterName: roaster.business_name,
    ...context,
  };
  const { system, user } = buildPrompt(type, userPrompt, promptContext);

  // Call Gemini API
  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: user,
      config: {
        systemInstruction: system,
        maxOutputTokens: 1024,
      },
    });

    const text = response.text;
    if (!text) {
      return NextResponse.json(
        { error: "No text in AI response" },
        { status: 500 }
      );
    }

    // Parse the 3 numbered options
    const options = parseOptions(text);

    // Determine whether to consume from monthly allocation or top-up balance
    const usesTopup = limitCheck.current + 1 > limitCheck.limit && limitCheck.limit !== Infinity;
    const source = usesTopup ? "topup" : "monthly";

    const promises: PromiseLike<unknown>[] = [
      supabase.rpc("increment_monthly_ai_credits", { p_roaster_id: roaster.id, p_count: 1 }),
      supabase.from("ai_credit_ledger").insert({
        roaster_id: roaster.id,
        credits_used: 1,
        action_type: type,
        source,
        metadata: { prompt: userPrompt?.slice(0, 200) },
      }),
    ];

    // If drawing from top-up, decrement the balance
    if (usesTopup) {
      promises.push(
        supabase.rpc("decrement_ai_topup_balance", { p_roaster_id: roaster.id as string, p_count: 1 })
      );
    }

    await Promise.all(promises);

    return NextResponse.json({
      options,
      usage: {
        used: limitCheck.current + 1,
        limit: limitCheck.limit,
      },
    });
  } catch (err: unknown) {
    console.error("AI generation error:", err);

    return NextResponse.json(
      { error: "Failed to generate content. Please try again." },
      { status: 500 }
    );
  }
}

function parseOptions(text: string): string[] {
  const lines = text.trim().split("\n").filter((l) => l.trim());
  const options: string[] = [];

  for (const line of lines) {
    // Match "1. ...", "2. ...", "3. ..."
    const match = line.match(/^\d+\.\s*(.+)$/);
    if (match) {
      options.push(match[1].trim());
    }
  }

  // Fallback: if parsing fails, split by newlines
  if (options.length === 0) {
    return lines.slice(0, 3);
  }

  return options.slice(0, 3);
}
