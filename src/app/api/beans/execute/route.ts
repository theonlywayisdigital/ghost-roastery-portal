import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { headers } from "next/headers";

// ── Types ──

interface PlannedAction {
  id: string;
  domain: string;
  action: string;
  label: string;
  type: "CREATE" | "UPDATE" | "DELETE" | "READ";
  destructive: boolean;
  endpoint: string;
  method: string;
  body: Record<string, unknown>;
  dependsOn: string[];
  conflictsWith: string[];
  diff: Array<{ field: string; from: unknown; to: unknown }>;
}

// ── Ownership validation ──

const OWNERSHIP_TABLES: Record<string, { table: string; column?: string }> = {
  products: { table: "products" },
  contacts: { table: "contacts" },
  orders: { table: "orders" },
  invoices: { table: "invoices" },
  wholesale_buyers: { table: "wholesale_access" },
  green_beans: { table: "green_beans" },
  roasted_stock: { table: "roasted_stock" },
  production: { table: "production_plans" },
  discount_codes: { table: "discount_codes" },
};

async function validateOwnership(
  roasterId: string,
  action: PlannedAction
): Promise<boolean> {
  // CREATE actions don't need ownership validation (new records)
  if (action.type === "CREATE") return true;

  // READ-only actions don't execute
  if (action.type === "READ") return true;

  // Extract the entity ID from the endpoint
  // Patterns: /api/products/{id}, /api/products/{id}/notes, /api/orders/{id}/status
  const match = action.endpoint.match(
    /\/api\/(?:tools\/)?(?:marketing\/)?([^/]+)\/([a-f0-9-]{36})/
  );
  if (!match) return true; // Can't extract ID — let the target route validate

  const entityId = match[2];
  const ownerConfig = OWNERSHIP_TABLES[action.domain];
  if (!ownerConfig) return true; // Unknown domain — let route validate

  const supabase = createServerClient();
  const { data } = await supabase
    .from(ownerConfig.table)
    .select("id")
    .eq("id", entityId)
    .eq(ownerConfig.column || "roaster_id", roasterId)
    .maybeSingle();

  return !!data;
}

// ── Execute a single action via internal fetch ──

async function executeAction(
  action: PlannedAction,
  baseUrl: string,
  cookieHeader: string
): Promise<{ success: boolean; error?: string; data?: unknown }> {
  try {
    const url = `${baseUrl}${action.endpoint}`;
    const fetchOptions: RequestInit = {
      method: action.method,
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
    };

    if (action.method !== "GET" && action.method !== "DELETE") {
      fetchOptions.body = JSON.stringify(action.body || {});
    } else if (action.method === "DELETE" && action.body && Object.keys(action.body).length > 0) {
      fetchOptions.body = JSON.stringify(action.body);
    }

    const res = await fetch(url, fetchOptions);
    const responseData = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        error: responseData.error || responseData.message || `HTTP ${res.status}`,
      };
    }

    return { success: true, data: responseData };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Execution failed",
    };
  }
}

// ── Log to activity table ──

async function logActivity(
  userId: string,
  action: PlannedAction,
  success: boolean,
  error?: string
) {
  const supabase = createServerClient();
  await supabase.from("user_activity_log").insert({
    user_id: userId,
    action: `beans_${action.action}`,
    description: `${success ? "Completed" : "Failed"}: ${action.label}`,
    metadata: {
      beans_action_id: action.id,
      domain: action.domain,
      type: action.type,
      endpoint: action.endpoint,
      destructive: action.destructive,
      ...(error ? { error } : {}),
    },
    performed_by: userId,
  });
}

// ── Main handler ──

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("roaster") || !user.roaster) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roasterId = user.roaster.id;

  try {
    const { plan } = (await request.json()) as { plan: PlannedAction[] };

    if (!plan || !Array.isArray(plan) || plan.length === 0) {
      return Response.json({ error: "Plan is required" }, { status: 400 });
    }

    // Get the base URL and cookie for internal requests
    const headersList = await headers();
    const host = headersList.get("host") || "localhost:3001";
    const proto = headersList.get("x-forwarded-proto") || "http";
    const baseUrl = `${proto}://${host}`;
    const cookieHeader = headersList.get("cookie") || "";

    // Filter out conflicting and READ-only actions
    const executableActions = plan.filter(
      (a) =>
        a.type !== "READ" &&
        (!a.conflictsWith || a.conflictsWith.length === 0) &&
        a.endpoint &&
        a.method
    );

    // SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function send(event: string, data: unknown) {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        }

        const completed = new Set<string>();
        const failed = new Set<string>();

        try {
          // Build a dependency graph
          const pending = new Map<string, PlannedAction>();
          for (const action of executableActions) {
            pending.set(action.id, action);
          }

          // Execute in waves: each wave runs all actions whose dependencies are met
          while (pending.size > 0) {
            // Find actions ready to run (all dependsOn completed)
            const ready: PlannedAction[] = [];
            for (const [id, action] of pending) {
              const deps = action.dependsOn || [];
              const depsComplete = deps.every(
                (depId) => completed.has(depId) || !pending.has(depId)
              );
              // If any dependency failed, skip this action
              const depsFailed = deps.some((depId) => failed.has(depId));
              if (depsFailed) {
                pending.delete(id);
                failed.add(id);
                send("progress", {
                  actionId: id,
                  status: "failed",
                  error: "Dependency failed",
                });
                await logActivity(user.id, action, false, "Dependency failed");
                continue;
              }
              if (depsComplete) {
                ready.push(action);
              }
            }

            if (ready.length === 0 && pending.size > 0) {
              // Circular dependency or stuck — fail remaining
              for (const [id, action] of pending) {
                send("progress", {
                  actionId: id,
                  status: "failed",
                  error: "Unresolvable dependency",
                });
                await logActivity(user.id, action, false, "Unresolvable dependency");
              }
              break;
            }

            // Mark all ready actions as running
            for (const action of ready) {
              send("progress", { actionId: action.id, status: "running" });
            }

            // Execute ready actions in parallel
            const results = await Promise.allSettled(
              ready.map(async (action) => {
                // Validate ownership first
                const owned = await validateOwnership(roasterId, action);
                if (!owned) {
                  return {
                    action,
                    result: {
                      success: false,
                      error: "Target entity does not belong to this roaster",
                    },
                  };
                }

                const result = await executeAction(action, baseUrl, cookieHeader);
                return { action, result };
              })
            );

            // Process results
            for (const settled of results) {
              if (settled.status === "rejected") {
                continue; // Shouldn't happen with our error handling
              }

              const { action, result } = settled.value;
              pending.delete(action.id);

              if (result.success) {
                completed.add(action.id);
                send("progress", { actionId: action.id, status: "done" });
              } else {
                failed.add(action.id);
                send("progress", {
                  actionId: action.id,
                  status: "failed",
                  error: result.error,
                });
              }

              await logActivity(user.id, action, result.success, result.error);
            }
          }

          send("complete", {
            total: executableActions.length,
            completed: completed.size,
            failed: failed.size,
          });
        } catch (err) {
          send("error", {
            error: err instanceof Error ? err.message : "Execution failed",
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
    console.error("Beans execute error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
