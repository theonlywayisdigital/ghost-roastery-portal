// ═══════════════════════════════════════════════════════════════
// AI Credits — shared check & consume helpers for all AI routes
// ═══════════════════════════════════════════════════════════════

import { createServerClient } from "@/lib/supabase";
import { checkLimit, type LimitCheckResult } from "@/lib/feature-gates";
import { type AiActionType, getAiCreditCost } from "@/lib/tier-config";

// ── Types ─────────────────────────────────────────────────────

export interface CreditCheckResult extends LimitCheckResult {
  creditsRequired: number;
}

export interface CreditConsumeResult {
  success: boolean;
  creditsUsed: number;
  source: "monthly" | "topup";
  error?: string;
}

// ── Public API ────────────────────────────────────────────────

/**
 * Check whether a roaster has enough credits for an AI action.
 * Call BEFORE the AI request to fast-fail.
 */
export async function checkAiCredits(
  roasterId: string,
  actionType: AiActionType
): Promise<CreditCheckResult> {
  const cost = getAiCreditCost(actionType);
  const limitCheck = await checkLimit(roasterId, "aiCreditsPerMonth", cost);

  return {
    ...limitCheck,
    creditsRequired: cost,
  };
}

/**
 * Consume credits after a successful AI response.
 * Draws from monthly allocation first, then top-up balance.
 * Writes an entry to ai_credit_ledger for the audit trail.
 */
export async function consumeAiCredits(
  roasterId: string,
  actionType: AiActionType,
  metadata?: Record<string, unknown>
): Promise<CreditConsumeResult> {
  const cost = getAiCreditCost(actionType);
  const supabase = createServerClient();

  try {
    // Re-check current state to determine source
    const limitCheck = await checkLimit(roasterId, "aiCreditsPerMonth", cost);

    if (!limitCheck.allowed) {
      return {
        success: false,
        creditsUsed: 0,
        source: "monthly",
        error: limitCheck.message || "Insufficient credits",
      };
    }

    // Determine whether monthly or top-up covers this
    const usesTopup = limitCheck.current + cost > limitCheck.limit && limitCheck.limit !== Infinity;
    const source: "monthly" | "topup" = usesTopup ? "topup" : "monthly";

    // Calculate split if partially covered by monthly
    let monthlyToConsume = cost;
    let topupToConsume = 0;

    if (usesTopup) {
      const monthlyRemaining = Math.max(limitCheck.limit - limitCheck.current, 0);
      monthlyToConsume = monthlyRemaining;
      topupToConsume = cost - monthlyRemaining;
    }

    const promises: PromiseLike<unknown>[] = [];

    // 1. Increment the monthly counter (RPC handles month boundary reset)
    if (monthlyToConsume > 0) {
      promises.push(
        supabase.rpc("increment_monthly_ai_credits", {
          p_roaster_id: roasterId,
          p_count: monthlyToConsume,
        })
      );
    }

    // 2. Decrement top-up balance if needed
    if (topupToConsume > 0) {
      promises.push(
        supabase.rpc("decrement_ai_topup_balance", {
          p_roaster_id: roasterId,
          p_count: topupToConsume,
        })
      );
    }

    // 3. Write audit ledger entry
    promises.push(
      supabase.from("ai_credit_ledger").insert({
        roaster_id: roasterId,
        credits_used: cost,
        action_type: actionType,
        source,
        metadata: metadata ?? {},
      })
    );

    await Promise.all(promises);

    return { success: true, creditsUsed: cost, source };
  } catch (err) {
    console.error("Failed to consume AI credits:", err);
    return {
      success: false,
      creditsUsed: 0,
      source: "monthly",
      error: err instanceof Error ? err.message : "Failed to consume credits",
    };
  }
}
