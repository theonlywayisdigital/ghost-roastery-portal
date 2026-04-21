import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// ── Tool definitions for Gemini ──

const toolDeclarations = [
  {
    name: "get_products",
    description:
      "Retrieves all products for the roaster including current prices, status, and sales channels. Call this first when the user asks about products or prices.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "update_product_prices",
    description:
      "Updates prices for one or more products. Each update must include the product_id and at least one of new_price or new_wholesale_price.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        updates: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              product_id: {
                type: Type.STRING,
                description: "The product ID to update",
              },
              new_price: {
                type: Type.NUMBER,
                description: "The new retail price",
              },
              new_wholesale_price: {
                type: Type.NUMBER,
                description: "The new wholesale price (optional)",
              },
            },
            required: ["product_id", "new_price"],
          },
          description: "Array of price updates to apply",
        },
      },
      required: ["updates"],
    },
  },
  {
    name: "get_contacts",
    description:
      "Retrieves contacts for the roaster with optional filters. Call this when the user asks about contacts, customers, or leads.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        limit: {
          type: Type.NUMBER,
          description: "Maximum number of contacts to return (default 50)",
        },
        created_after: {
          type: Type.STRING,
          description:
            "ISO date string — only return contacts created after this date",
        },
        type: {
          type: Type.STRING,
          description:
            'Filter by contact type: "retail", "wholesale", "lead", "supplier"',
        },
      },
    },
  },
];

const SYSTEM_PROMPT = `You are an AI assistant for a coffee roastery platform. When the user asks you to do something, use the available tools to build a plan.

Rules:
- Always call get_products or get_contacts FIRST if you need data before making changes.
- For price changes, calculate the exact new prices before calling update_product_prices.
- When rounding prices, round to the nearest increment the user specifies.
- Return a clear plan of what you will do.
- Be concise in your text responses.
- When creating a plan for an order, describe what you would create but note this is a spike — order creation is not yet available.
- Today's date is ${new Date().toISOString().split("T")[0]}.`;

// ── Tool implementations ──

async function executeGetProducts(roasterId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, price, retail_price, wholesale_price, status, is_retail, is_wholesale, unit, sku"
    )
    .eq("roaster_id", roasterId)
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(`Failed to fetch products: ${error.message}`);
  return data || [];
}

async function executeGetContacts(
  roasterId: string,
  params: { limit?: number; created_after?: string; type?: string }
) {
  const supabase = createServerClient();
  let query = supabase
    .from("contacts")
    .select(
      "id, first_name, last_name, email, types, source, created_at, status"
    )
    .eq("roaster_id", roasterId)
    .eq("status", "active");

  if (params.created_after) {
    query = query.gte("created_at", params.created_after);
  }
  if (params.type) {
    query = query.contains("types", [params.type]);
  }

  query = query.order("created_at", { ascending: false });
  query = query.limit(params.limit || 50);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch contacts: ${error.message}`);
  return data || [];
}

function executeUpdateProductPrices(
  updates: { product_id: string; new_price: number; new_wholesale_price?: number }[],
  products: Array<{ id: string; name: string; price: number; wholesale_price: number | null }>
) {
  // SPIKE MODE: Do not write to DB — log only
  const results = updates.map((u) => {
    const product = products.find((p) => p.id === u.product_id);
    const result = {
      product_id: u.product_id,
      product_name: product?.name || "Unknown",
      old_price: product?.price || 0,
      new_price: u.new_price,
      old_wholesale_price: product?.wholesale_price || null,
      new_wholesale_price: u.new_wholesale_price || null,
      success: true,
    };
    console.log(
      `[SPIKE] Would update product "${result.product_name}": price ${result.old_price} → ${result.new_price}${
        u.new_wholesale_price
          ? `, wholesale ${result.old_wholesale_price} → ${u.new_wholesale_price}`
          : ""
      }`
    );
    return result;
  });
  return { updated: results.length, results };
}

// ── Main handler ──

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI generation is not configured" },
      { status: 503 }
    );
  }

  const user = await getCurrentUser();
  if (!user?.roles.includes("roaster") || !user.roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roasterId = user.roaster.id;

  try {
    const { message, history } = await request.json();
    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Build conversation history
    const contents: Array<{
      role: "user" | "model";
      parts: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> }; functionResponse?: { name: string; response: Record<string, unknown> } }>;
    }> = [];

    if (history && Array.isArray(history)) {
      for (const msg of history) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        });
      }
    }

    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    // Keep a local cache of fetched products for price update diffs
    let cachedProducts: Array<{
      id: string;
      name: string;
      price: number;
      retail_price: number | null;
      wholesale_price: number | null;
      status: string;
      is_retail: boolean;
      is_wholesale: boolean;
      unit: string | null;
      sku: string | null;
    }> = [];

    // SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function send(event: string, data: unknown) {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        }

        try {
          let currentContents = [...contents];
          let iterations = 0;
          const MAX_ITERATIONS = 5;

          // Agentic loop: keep calling Gemini until it stops returning function calls
          while (iterations < MAX_ITERATIONS) {
            iterations++;

            const response = await ai.models.generateContent({
              model: "gemini-2.0-flash",
              contents: currentContents,
              config: {
                systemInstruction: SYSTEM_PROMPT,
                tools: [{ functionDeclarations: toolDeclarations }],
              },
            });

            const functionCalls = response.functionCalls;

            if (!functionCalls || functionCalls.length === 0) {
              // No function calls — model returned a text response
              const text = response.text || "";
              send("message", { text });
              break;
            }

            // Process each function call
            const functionResponseParts: Array<{
              functionResponse: { name: string; response: Record<string, unknown> };
            }> = [];

            for (const fc of functionCalls) {
              const args = (fc.args || {}) as Record<string, unknown>;
              let result: unknown;

              try {
                switch (fc.name) {
                  case "get_products": {
                    const products = await executeGetProducts(roasterId);
                    cachedProducts = products;
                    result = { products };
                    send("tool_result", {
                      tool: "get_products",
                      action: "READ",
                      summary: `Found ${products.length} products`,
                      data: products.map((p) => ({
                        id: p.id,
                        name: p.name,
                        price: p.price,
                        retail_price: p.retail_price,
                        wholesale_price: p.wholesale_price,
                        status: p.status,
                      })),
                    });
                    break;
                  }

                  case "get_contacts": {
                    const contacts = await executeGetContacts(roasterId, {
                      limit: args.limit as number | undefined,
                      created_after: args.created_after as string | undefined,
                      type: args.type as string | undefined,
                    });
                    result = { contacts };
                    send("tool_result", {
                      tool: "get_contacts",
                      action: "READ",
                      summary: `Found ${contacts.length} contacts`,
                      data: contacts.map((c) => ({
                        id: c.id,
                        name: `${c.first_name} ${c.last_name}`,
                        email: c.email,
                        types: c.types,
                        created_at: c.created_at,
                      })),
                    });
                    break;
                  }

                  case "update_product_prices": {
                    const updates = args.updates as Array<{
                      product_id: string;
                      new_price: number;
                      new_wholesale_price?: number;
                    }>;

                    // If products weren't fetched yet, fetch them now
                    if (cachedProducts.length === 0) {
                      cachedProducts = await executeGetProducts(roasterId);
                    }

                    const priceResult = executeUpdateProductPrices(
                      updates,
                      cachedProducts
                    );
                    result = priceResult;

                    // Send each update as a separate card
                    for (const u of priceResult.results) {
                      send("tool_result", {
                        tool: "update_product_prices",
                        action: "UPDATE",
                        summary: u.product_name,
                        target: `Product: ${u.product_name}`,
                        diff: {
                          price: {
                            before: u.old_price,
                            after: u.new_price,
                          },
                          ...(u.new_wholesale_price
                            ? {
                                wholesale_price: {
                                  before: u.old_wholesale_price,
                                  after: u.new_wholesale_price,
                                },
                              }
                            : {}),
                        },
                      });
                    }
                    break;
                  }

                  default:
                    result = { error: `Unknown tool: ${fc.name}` };
                }
              } catch (err) {
                result = {
                  error:
                    err instanceof Error
                      ? err.message
                      : "Tool execution failed",
                };
                send("error", {
                  tool: fc.name,
                  error: result,
                });
              }

              functionResponseParts.push({
                functionResponse: {
                  name: fc.name,
                  response: result as Record<string, unknown>,
                },
              });
            }

            // Add the model's function call and our responses to the conversation
            currentContents.push({
              role: "model",
              parts: functionCalls.map((fc) => ({
                functionCall: { name: fc.name, args: fc.args as Record<string, unknown> },
              })),
            });
            currentContents.push({
              role: "user",
              parts: functionResponseParts,
            });
          }

          send("done", {});
        } catch (err) {
          send("error", {
            error:
              err instanceof Error ? err.message : "An unexpected error occurred",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("AI agent spike error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
