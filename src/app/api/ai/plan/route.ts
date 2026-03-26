import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getCurrentRoaster } from "@/lib/auth";
import { checkAiCredits, consumeAiCredits } from "@/lib/ai-credits";
import { type AiActionType } from "@/lib/tier-config";

type PlanType = "campaign" | "social" | "automation" | "ideas";

interface PlanRequest {
  plan_type: PlanType;
  inputs: Record<string, unknown>;
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

  let body: PlanRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.plan_type || !body.inputs) {
    return NextResponse.json({ error: "Missing plan_type or inputs" }, { status: 400 });
  }

  // Credit check
  const actionType = `plan_${body.plan_type}` as AiActionType;
  const creditCheck = await checkAiCredits(roaster.id as string, actionType);
  if (!creditCheck.allowed) {
    return NextResponse.json(
      { error: creditCheck.message, rate_limited: true, upgrade_required: true },
      { status: 429 }
    );
  }

  const { system, user } = buildPlanPrompt(body.plan_type, body.inputs, roaster.business_name);

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

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ error: "AI returned invalid format" }, { status: 500 });
      }
    }

    await consumeAiCredits(roaster.id as string, actionType);

    return NextResponse.json({
      plan: parsed,
    });
  } catch (err) {
    console.error("AI plan generation error:", err);
    return NextResponse.json({ error: "Failed to generate plan. Please try again." }, { status: 500 });
  }
}

function buildPlanPrompt(type: PlanType, inputs: Record<string, unknown>, businessName: string) {
  const brand = `You are a marketing strategist for a specialty coffee roaster called "${businessName}".`;

  switch (type) {
    case "campaign":
      return {
        system: `${brand}

Generate a complete campaign plan as JSON with this structure:
{
  "summary": "Brief campaign overview (1-2 sentences)",
  "emails": [
    {
      "day": 1,
      "subject": "Suggested subject line",
      "description": "What this email covers and its goal",
      "brief": "Detailed brief that could be fed to an AI email generator"
    }
  ],
  "social_posts": [
    {
      "day": 1,
      "platform": "instagram",
      "description": "What this post is about",
      "caption": "Suggested caption text",
      "image_concept": "Description of the visual"
    }
  ],
  "discount_strategy": "Recommended discount approach (or null if not relevant)",
  "timeline_days": 7
}

Be specific and actionable. Every item should be ready to execute. Return ONLY valid JSON.`,
        user: `Create a campaign plan.
Goal: ${inputs.goal || "General marketing"}
Target audience: ${inputs.audience || "All customers"}
Timeframe: ${inputs.timeframe || "2 weeks"}
Channels: ${inputs.channels || "email and social"}
Additional context: ${inputs.notes || "None"}`,
      };

    case "social":
      return {
        system: `${brand}

Generate a social media content plan as JSON with this structure:
{
  "summary": "Content plan overview",
  "posts": [
    {
      "day": "Monday",
      "date_offset": 0,
      "platform": "instagram",
      "caption": "Full post caption with hashtags",
      "image_concept": "Description of the visual/photo to use",
      "best_time": "10:00 AM",
      "content_theme": "Product spotlight"
    }
  ],
  "themes_used": ["Product spotlight", "Behind the scenes", "Customer story"],
  "hashtag_sets": { "primary": ["#specialtycoffee", "#coffeeroaster"], "secondary": ["#morningcoffee"] }
}

Be specific with captions — write the actual text, not placeholders. Return ONLY valid JSON.`,
        user: `Create a social media content plan.
Timeframe: ${inputs.timeframe || "this week"}
Platforms: ${inputs.platforms || "instagram, facebook"}
Posting frequency: ${inputs.frequency || "3 times per week"}
Content themes or products: ${inputs.themes || "General coffee content"}
Additional context: ${inputs.notes || "None"}`,
      };

    case "automation":
      return {
        system: `${brand}

Suggest marketing automations as JSON with this structure:
{
  "automations": [
    {
      "name": "Automation name",
      "trigger": "new_customer",
      "description": "What this automation does and why",
      "steps": [
        { "type": "email", "delay_days": 0, "subject": "Subject line", "description": "Email content brief" },
        { "type": "delay", "delay_days": 3 },
        { "type": "email", "delay_days": 0, "subject": "Follow up subject", "description": "Email content brief" }
      ],
      "expected_impact": "High — captures new customers at peak interest",
      "priority": "high"
    }
  ]
}

Valid triggers: new_customer, post_purchase, review_request, win_back, abandoned_cart, wholesale_approved, birthday, re_engagement.
Priority must be "high", "medium", or "low".
Suggest 3-5 automations, ordered by impact. Return ONLY valid JSON.`,
        user: `Suggest marketing automations for this coffee business.
Business type: Specialty coffee roaster
Additional context: ${inputs.notes || "None"}`,
      };

    case "ideas":
      return {
        system: `${brand}

Generate content ideas as JSON with this structure:
{
  "ideas": [
    {
      "title": "Idea title",
      "type": "email",
      "description": "2-3 sentences describing the idea, why it works, and what to include",
      "brief": "Detailed brief that could be used to create this content"
    }
  ]
}

Valid types: "email", "social", "promotion", "blog".
Generate exactly 10 ideas, ordered by potential impact. Be creative and specific to the coffee industry. Return ONLY valid JSON.`,
        user: `Generate content ideas.
What they want ideas for: ${inputs.category || "everything"}
Additional context: ${inputs.notes || "None"}`,
      };

    default:
      return { system: brand, user: "Generate marketing suggestions." };
  }
}
