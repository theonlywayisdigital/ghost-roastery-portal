import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

const MAX_DAILY_GENERATIONS = 20;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI generation is not configured" }, { status: 503 });
  }

  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { prompt: string; contactName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  // Rate limiting (matching generate-email pattern)
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

  const contactName = body.contactName || "the recipient";

  const system = `You are a professional email copywriter for a specialty coffee business called "${roaster.business_name}".

Write a plain-text email body based on the user's brief. The email is addressed to ${contactName}.

RULES:
- Write only the email body — no subject line, no "Dear..." greeting unless the brief asks for one.
- Start with a natural greeting like "Hi ${contactName.split(" ")[0]}," or similar.
- Keep it professional but warm.
- Do not use markdown formatting. Write plain text only.
- Do not include sign-off signature — the sender's email client handles that.
- Keep it concise — 2-4 short paragraphs unless the brief calls for more detail.
- Return ONLY the email body text. No commentary, no labels, no JSON.`;

  const userPrompt = `Write an email: ${body.prompt.trim()}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: system,
        maxOutputTokens: 1024,
      },
    });

    const text = response.text;
    if (!text) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Increment usage
    await supabase
      .from("partner_roasters")
      .update({ ai_generations_today: generationsToday + 1 })
      .eq("id", roaster.id);

    return NextResponse.json({
      body: text.trim(),
      usage: { used: generationsToday + 1, limit: MAX_DAILY_GENERATIONS },
    });
  } catch (err) {
    console.error("AI compose email error:", err);
    return NextResponse.json({ error: "Failed to generate email. Please try again." }, { status: 500 });
  }
}
