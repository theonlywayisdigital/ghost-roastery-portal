import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getCurrentRoaster } from "@/lib/auth";
import { buildPrompt, type GenerationType } from "@/lib/ai-prompts";
import { checkAiCredits, consumeAiCredits } from "@/lib/ai-credits";
import { type AiActionType } from "@/lib/tier-config";

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

  // Check AI credits (type doubles as AiActionType for light suggestions)
  const actionType = type as unknown as AiActionType;
  const creditCheck = await checkAiCredits(roaster.id as string, actionType);
  if (!creditCheck.allowed) {
    return NextResponse.json(
      {
        error: creditCheck.message,
        rate_limited: true,
        upgrade_required: true,
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

    // Consume credits after successful response
    await consumeAiCredits(roaster.id as string, actionType, {
      prompt: userPrompt?.slice(0, 200),
    });

    return NextResponse.json({
      options,
      usage: {
        used: creditCheck.current + creditCheck.creditsRequired,
        limit: creditCheck.limit,
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
