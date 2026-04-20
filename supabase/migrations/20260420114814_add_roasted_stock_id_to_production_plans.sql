-- Add roasted_stock_id to production_plans to link plans to roast profiles
ALTER TABLE public.production_plans
  ADD COLUMN IF NOT EXISTS roasted_stock_id uuid
  REFERENCES public.roasted_stock(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_production_plans_roasted_stock
  ON public.production_plans(roasted_stock_id);
