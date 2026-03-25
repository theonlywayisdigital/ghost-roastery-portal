import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI chat is not configured" },
      { status: 503 }
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    message: string;
    history: ChatMessage[];
    conversationId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { message, history = [], conversationId } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // On first message (no history), fetch KB articles for context
  let kbContext = "";
  if (history.length === 0) {
    // Determine audience
    const audienceFilters: string[] = [];
    if (user.roles.includes("admin") || user.roles.includes("super_admin")) {
      audienceFilters.push("admin", "roaster", "customer");
    } else if (user.roles.includes("roaster")) {
      audienceFilters.push("roaster");
    } else {
      audienceFilters.push("customer");
    }

    const { data: articles } = await supabase
      .from("kb_articles")
      .select("title, content, excerpt, type")
      .eq("is_active", true)
      .overlaps("audience", audienceFilters)
      .order("view_count", { ascending: false })
      .limit(20);

    if (articles && articles.length > 0) {
      kbContext = articles
        .map(
          (a) =>
            `## ${a.title}\n${a.excerpt ? a.excerpt + "\n" : ""}${a.content}`
        )
        .join("\n\n---\n\n");
    }
  }

  const systemPrompt = `You are a helpful support assistant for Roastery Platform, a coffee roasting platform that connects coffee roasters with customers.

Your job is to help users with their questions about orders, billing, accounts, and the platform.

RULES:
- Only answer questions using the knowledge base content provided below when available
- Be concise, friendly, and professional
- If you don't know the answer or the question is about a specific order, account issue, or billing problem, suggest creating a support ticket
- Never make up information about orders, prices, or account details
- If the user seems frustrated or the issue requires human intervention, suggest creating a ticket
- Keep responses under 200 words

${kbContext ? `KNOWLEDGE BASE:\n${kbContext}` : "No knowledge base articles are available."}`;

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Build conversation contents for Gemini
    const conversationParts = history.map((msg) => ({
      role: msg.role === "user" ? "user" : ("model" as const),
      parts: [{ text: msg.content }],
    }));

    // Add current message
    conversationParts.push({
      role: "user" as const,
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: conversationParts,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 512,
      },
    });

    const responseText = response.text || "I'm sorry, I couldn't process that. Please try again.";

    // Check if response suggests creating a ticket
    const suggestTicket =
      responseText.toLowerCase().includes("create a ticket") ||
      responseText.toLowerCase().includes("support ticket") ||
      responseText.toLowerCase().includes("raise a ticket") ||
      message.toLowerCase().includes("speak to") ||
      message.toLowerCase().includes("talk to") ||
      message.toLowerCase().includes("human") ||
      message.toLowerCase().includes("agent");

    // Save/update conversation
    const now = new Date().toISOString();
    const allMessages: ChatMessage[] = [
      ...history,
      { role: "user", content: message, timestamp: now },
      { role: "assistant", content: responseText, timestamp: now },
    ];

    let savedConversationId = conversationId;

    if (conversationId) {
      // Update existing
      await supabase
        .from("chatbot_conversations")
        .update({ messages: allMessages })
        .eq("id", conversationId);
    } else {
      // Create new
      const { data: conv } = await supabase
        .from("chatbot_conversations")
        .insert({
          user_id: user.id,
          messages: allMessages,
        })
        .select("id")
        .single();

      savedConversationId = conv?.id;
    }

    return NextResponse.json({
      response: responseText,
      suggest_ticket: suggestTicket,
      conversationId: savedConversationId,
    });
  } catch (err) {
    console.error("Chatbot error:", err);
    return NextResponse.json(
      { error: "Failed to generate response. Please try again." },
      { status: 500 }
    );
  }
}
