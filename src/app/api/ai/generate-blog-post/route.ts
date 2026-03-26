import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getCurrentRoaster } from "@/lib/auth";
import { checkAiCredits, consumeAiCredits } from "@/lib/ai-credits";

interface GenerateBlogPostRequest {
  topic: string;
  keywords: string;
  tone: "professional" | "friendly" | "casual" | "educational" | "storytelling";
  length: "short" | "medium" | "long";
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

  let body: GenerateBlogPostRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.topic?.trim()) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 });
  }

  // Credit check
  const creditCheck = await checkAiCredits(roaster.id as string, "generate_blog_post");
  if (!creditCheck.allowed) {
    return NextResponse.json(
      { error: creditCheck.message, rate_limited: true, upgrade_required: true },
      { status: 429 }
    );
  }

  const keywordsContext = body.keywords?.trim()
    ? `\n\nTarget keywords to naturally weave into the content: ${body.keywords.trim()}`
    : "";

  const blockCount = body.length === "short" ? "4-6" : body.length === "medium" ? "7-10" : "11-15";
  const wordCount = body.length === "short" ? "300-500" : body.length === "medium" ? "600-900" : "1000-1500";

  const toneGuide: Record<string, string> = {
    professional: "Professional and authoritative. Clean, knowledgeable language suitable for industry peers.",
    friendly: "Warm and approachable. Conversational but informative.",
    casual: "Relaxed and fun. Short sentences, informal language, personality-driven.",
    educational: "Informative and instructional. Clear explanations, helpful tips, structured learning.",
    storytelling: "Narrative-driven. Paint pictures, share experiences, take the reader on a journey.",
  };

  const system = `You are an expert blog writer for a specialty coffee roaster called "${roaster.business_name}".

Your task is to generate a complete blog post as a JSON object with this EXACT structure:
{
  "title": "Blog post title (compelling, SEO-friendly, under 70 chars)",
  "slug": "url-friendly-slug-with-hyphens",
  "excerpt": "A compelling 1-2 sentence summary for previews (under 160 chars)",
  "seo_title": "SEO meta title (under 60 chars, include primary keyword)",
  "seo_description": "SEO meta description (under 160 chars, compelling with keyword)",
  "blocks": [
    // Array of content blocks
  ]
}

Each block in the "blocks" array must be one of these types:

1. Heading block:
   {"type": "heading", "data": {"text": "Section heading", "level": 2, "align": "left"}}
   Use level 2 for section headings, level 3 for sub-sections. Do NOT include a level 1 heading — the title is shown separately.

2. Text block:
   {"type": "text", "data": {"html": "<p>Paragraph text with <strong>bold</strong> and <em>italic</em> and <a href=\\"/shop\\">links</a>.</p>"}}
   Use proper HTML. You can include multiple paragraphs, bullet lists (<ul><li>), numbered lists (<ol><li>).
   Keep paragraphs concise (2-4 sentences). Use formatting for emphasis.

3. Image block (placeholder suggestion — user will upload actual images):
   {"type": "image", "data": {"src": "", "alt": "Description of what image should go here", "align": "center", "width": "full"}}
   Include 1-2 image suggestions in appropriate places.

4. Button block (for CTAs):
   {"type": "button", "data": {"text": "Button text", "url": "/shop", "align": "center", "style": "filled", "size": "md"}}

5. Divider block:
   {"type": "divider", "data": {}}

6. Spacer block:
   {"type": "spacer", "data": {"height": 24}}

RULES:
- Generate approximately ${blockCount} content blocks (not counting spacers/dividers), totalling roughly ${wordCount} words of body text
- Tone: ${toneGuide[body.tone] || toneGuide.friendly}
- Structure: Start with an engaging intro paragraph, use heading blocks to separate sections, end with a conclusion and CTA
- Write genuinely useful, interesting content — not generic filler
- Use spacer blocks (height 16-24) between major sections for breathing room
- Include 1-2 image placeholder blocks with descriptive alt text suggesting what photo would work well
- End with a CTA button linking to /shop or /contact as appropriate
- Do NOT include "id" fields — those will be added automatically
- Return ONLY valid JSON. No markdown fences, no explanation, no commentary.
- The JSON must be parseable by JSON.parse() directly.`;

  const user = `Write a complete blog post about: ${body.topic}${keywordsContext}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: user,
      config: {
        systemInstruction: system,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    let parsed: {
      title: string;
      slug: string;
      excerpt: string;
      seo_title: string;
      seo_description: string;
      blocks: Array<{ type: string; data: Record<string, unknown> }>;
    };
    try {
      parsed = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        console.error("Failed to parse AI blog response:", text.slice(0, 500));
        return NextResponse.json({ error: "AI returned invalid format. Please try again." }, { status: 500 });
      }
    }

    // Add IDs to blocks
    const blocks = (parsed.blocks || []).map((block: { type: string; data: Record<string, unknown> }) => ({
      ...block,
      id: Math.random().toString(36).slice(2, 8),
    }));

    // Consume credits
    await consumeAiCredits(roaster.id as string, "generate_blog_post");

    return NextResponse.json({
      title: parsed.title || "",
      slug: parsed.slug || "",
      excerpt: parsed.excerpt || "",
      seo_title: parsed.seo_title || "",
      seo_description: parsed.seo_description || "",
      blocks,
    });
  } catch (err) {
    console.error("AI blog generation error:", err);
    return NextResponse.json({ error: "Failed to generate blog post. Please try again." }, { status: 500 });
  }
}
