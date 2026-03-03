import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { buildPrompt, type GenerationType } from "@/lib/ai-prompts";

const MAX_DAILY_GENERATIONS = 20;

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

  // Rate limiting
  const supabase = createServerClient();
  const now = new Date();

  let generationsToday = (roaster as Record<string, unknown>).ai_generations_today as number || 0;
  const resetAt = (roaster as Record<string, unknown>).ai_generation_reset_at as string | null;

  // Reset counter if it's a new day
  if (!resetAt || new Date(resetAt) < now) {
    generationsToday = 0;
    const tomorrow = new Date(now);
    tomorrow.setUTCHours(0, 0, 0, 0);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    await supabase
      .from("partner_roasters")
      .update({
        ai_generations_today: 0,
        ai_generation_reset_at: tomorrow.toISOString(),
      })
      .eq("id", roaster.id);
  }

  if (generationsToday >= MAX_DAILY_GENERATIONS) {
    return NextResponse.json(
      {
        error: `Daily limit reached (${MAX_DAILY_GENERATIONS} generations). Resets at midnight UTC.`,
        rate_limited: true,
      },
      { status: 429 }
    );
  }

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

    // Increment usage counter
    await supabase
      .from("partner_roasters")
      .update({ ai_generations_today: generationsToday + 1 })
      .eq("id", roaster.id);

    return NextResponse.json({
      options,
      usage: {
        used: generationsToday + 1,
        limit: MAX_DAILY_GENERATIONS,
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
