-- RPC to safely decrement AI top-up balance (floor at 0)
CREATE OR REPLACE FUNCTION decrement_ai_topup_balance(p_roaster_id UUID, p_count INT DEFAULT 1)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE partner_roasters
  SET ai_credits_topup_balance = GREATEST(ai_credits_topup_balance - p_count, 0)
  WHERE id = p_roaster_id;
END;
$$;
