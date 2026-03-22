import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { syncConnection } from "@/lib/email/sync";
import type { EmailConnection } from "@/types/email";

/**
 * GET /api/cron/sync-email — Background sync for all connected email accounts
 * Triggered by external cron (e.g. Vercel Cron).
 * Pulls new emails from Gmail and Outlook for all connected roasters.
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Fetch all active email connections
  const { data: connections, error: connError } = await supabase
    .from("email_connections")
    .select("*")
    .eq("status", "connected");

  if (connError) {
    console.error("Sync-email: failed to fetch connections:", connError);
    return NextResponse.json({ error: "Failed to fetch connections" }, { status: 500 });
  }

  if (!connections || connections.length === 0) {
    return NextResponse.json({ processed: 0, total: 0, synced: 0, errors: [] });
  }

  let totalSynced = 0;
  let processed = 0;
  const errors: string[] = [];

  for (const conn of connections as EmailConnection[]) {
    try {
      const result = await syncConnection(conn, supabase);
      totalSynced += result.synced;
      errors.push(...result.errors);
      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`${conn.provider}/${conn.email_address}: ${msg}`);

      // If token refresh failed, mark connection as expired
      if (msg.includes("token refresh failed") || msg.includes("invalid_grant")) {
        await supabase
          .from("email_connections")
          .update({ status: "expired" })
          .eq("id", conn.id);
      }
    }
  }

  return NextResponse.json({
    processed,
    total: connections.length,
    synced: totalSynced,
    errors,
  });
}
