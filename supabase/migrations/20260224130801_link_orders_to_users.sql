-- Migration: link_orders_to_users
-- orders.user_id already exists (references auth.users).
-- wholesale_orders needs a user_id column added.

ALTER TABLE public.wholesale_orders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id);

CREATE INDEX IF NOT EXISTS idx_wholesale_orders_user_id
  ON public.wholesale_orders(user_id);

-- Link existing wholesale orders to users by matching customer_email
-- (only where a matching user account exists)
UPDATE public.wholesale_orders wo
  SET user_id = u.id
  FROM public.users u
  WHERE wo.user_id IS NULL
    AND lower(wo.customer_email) = lower(u.email);

-- Grant retail_buyer role to users who have wholesale_orders linked
-- (these are storefront retail purchases)
INSERT INTO public.user_roles (user_id, role_id)
SELECT DISTINCT wo.user_id, 'retail_buyer'
FROM public.wholesale_orders wo
WHERE wo.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = wo.user_id
      AND ur.role_id = 'retail_buyer'
      AND ur.roaster_id IS NULL
  );

NOTIFY pgrst, 'reload schema';
