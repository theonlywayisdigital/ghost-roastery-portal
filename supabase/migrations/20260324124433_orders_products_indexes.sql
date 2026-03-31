-- Performance indexes for orders table
-- Used by: /api/orders/all, /api/orders/[id], /api/admin/orders, /api/my-orders, and many more
CREATE INDEX IF NOT EXISTS idx_orders_roaster_id ON public.orders(roaster_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- Performance index for products table
-- Used by: /api/products (every GET/PATCH/DELETE filters on roaster_id)
CREATE INDEX IF NOT EXISTS idx_products_roaster_id ON public.products(roaster_id);
