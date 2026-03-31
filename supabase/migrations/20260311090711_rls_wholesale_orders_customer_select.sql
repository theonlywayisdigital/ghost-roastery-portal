-- Allow authenticated customers to read their own orders on the storefront.
-- Storefront pages filter by roaster_id in the query — this policy
-- only enforces that users can only see rows where user_id = their uid.

CREATE POLICY "customers_read_own_orders" ON wholesale_orders
  FOR SELECT
  USING (user_id = auth.uid());
