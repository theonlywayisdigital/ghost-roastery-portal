import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import type { TierLevel } from "@/lib/tier-config";
import { getEffectiveLimits } from "@/lib/tier-config";

// GET — Fetch AI credit summary + recent ledger entries
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const [roasterResult, ledgerResult] = await Promise.all([
    supabase
      .from("partner_roasters")
      .select("marketing_tier, monthly_ai_credits_used, monthly_ai_credits_reset_at, ai_credits_topup_balance")
      .eq("id", id)
      .single(),
    supabase
      .from("ai_credit_ledger")
      .select("*")
      .eq("roaster_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (roasterResult.error || !roasterResult.data) {
    return NextResponse.json({ error: "Roaster not found" }, { status: 404 });
  }

  const r = roasterResult.data;
  const marketingTier = (r.marketing_tier as TierLevel) || "free";
  const limits = getEffectiveLimits("free", marketingTier);

  return NextResponse.json({
    monthlyAllocation: limits.aiCreditsPerMonth,
    monthlyUsed: (r.monthly_ai_credits_used as number) || 0,
    topupBalance: (r.ai_credits_topup_balance as number) || 0,
    ledger: ledgerResult.data || [],
  });
}

// POST — Admin grants top-up credits
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { credits, reason } = body as { credits: number; reason?: string };

  if (!credits || credits < 1 || credits > 10000) {
    return NextResponse.json({ error: "Credits must be between 1 and 10,000" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Verify roaster exists
  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select("id, ai_credits_topup_balance")
    .eq("id", id)
    .single();

  if (!roaster) {
    return NextResponse.json({ error: "Roaster not found" }, { status: 404 });
  }

  const newBalance = ((roaster.ai_credits_topup_balance as number) || 0) + credits;

  // Update balance + insert ledger entry
  const [updateResult, ledgerResult] = await Promise.all([
    supabase
      .from("partner_roasters")
      .update({
        ai_credits_topup_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id),
    supabase.from("ai_credit_ledger").insert({
      roaster_id: id,
      credits_used: -credits, // negative = credits added
      action_type: "admin_topup",
      source: "topup_admin",
      granted_by: user.id,
      reason: reason || null,
      metadata: { granted_by_name: user.fullName || user.email },
    }),
  ]);

  if (updateResult.error) {
    console.error("Failed to update topup balance:", updateResult.error);
    return NextResponse.json({ error: "Failed to update balance" }, { status: 500 });
  }
  if (ledgerResult.error) {
    console.error("Failed to insert ledger entry:", ledgerResult.error);
  }

  return NextResponse.json({ success: true, newBalance });
}
