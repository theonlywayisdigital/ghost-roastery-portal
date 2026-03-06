import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { type TierLevel, getEffectiveLimits } from "@/lib/tier-config";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roaster = user.roaster;
  if (!roaster) {
    return NextResponse.json({ error: "No roaster found" }, { status: 400 });
  }

  const supabase = createServerClient();

  const marketingTier = (roaster.marketing_tier as TierLevel) || "free";
  const limits = getEffectiveLimits("free", marketingTier);

  const { data: ledger } = await supabase
    .from("ai_credit_ledger")
    .select("id, credits_used, action_type, source, reason, created_at")
    .eq("roaster_id", roaster.id)
    .order("created_at", { ascending: false })
    .limit(30);

  return NextResponse.json({
    monthlyAllocation: limits.aiCreditsPerMonth,
    monthlyUsed: (roaster.monthly_ai_credits_used as number) || 0,
    topupBalance: (roaster.ai_credits_topup_balance as number) || 0,
    ledger: ledger || [],
  });
}
