import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getCurrentRoaster } from "@/lib/auth";
import { checkAiCredits, consumeAiCredits } from "@/lib/ai-credits";

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

  // Credit check
  const creditCheck = await checkAiCredits(roaster.id as string, "compose_contact_email");
  if (!creditCheck.allowed) {
    return NextResponse.json(
      { error: creditCheck.message, rate_limited: true, upgrade_required: true },
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

    // Consume credits
    await consumeAiCredits(roaster.id as string, "compose_contact_email");

    return NextResponse.json({
      body: text.trim(),
    });
  } catch (err) {
    console.error("AI compose email error:", err);
    return NextResponse.json({ error: "Failed to generate email. Please try again." }, { status: 500 });
  }
}
