-- ============================================================================
-- Seed realistic test data for "Test Roaster" (id: 0f15f667-f15e-4e29-9307-05a41cd5c311)
-- Creates products, customers, businesses, wholesale access, and orders
-- in various statuses for testing the invoice system
-- ============================================================================

-- Test Roaster ID constant
-- 0f15f667-f15e-4e29-9307-05a41cd5c311

-- ============================================================================
-- 1. ADD MORE PRODUCTS FOR TEST ROASTER
-- ============================================================================

INSERT INTO public.wholesale_products (id, roaster_id, name, description, price, retail_price, unit, product_type, wholesale_price_standard, wholesale_price_preferred, wholesale_price_vip, minimum_wholesale_quantity, is_active, is_purchasable, sort_order) VALUES
  ('d1000001-0001-4000-8000-000000000001', '0f15f667-f15e-4e29-9307-05a41cd5c311',
   'Ethiopian Yirgacheffe', 'Bright and floral single-origin from Gedeo zone. Notes of jasmine, bergamot, and stone fruit.',
   14.50, 14.50, '250g', 'both', 9.80, 8.50, 7.20, 5, true, true, 1),

  ('d1000001-0001-4000-8000-000000000002', '0f15f667-f15e-4e29-9307-05a41cd5c311',
   'Colombian Huila Decaf', 'Swiss Water Process decaf. Rich chocolate, caramel, and a hint of citrus.',
   13.00, 13.00, '250g', 'both', 8.80, 7.50, 6.50, 5, true, true, 2),

  ('d1000001-0001-4000-8000-000000000003', '0f15f667-f15e-4e29-9307-05a41cd5c311',
   'House Blend', 'Our signature blend — Brazil, Guatemala, Ethiopia. Smooth, nutty, with dark chocolate finish.',
   12.00, 12.00, '250g', 'both', 8.00, 7.00, 6.00, 5, true, true, 3),

  ('d1000001-0001-4000-8000-000000000004', '0f15f667-f15e-4e29-9307-05a41cd5c311',
   'Kenyan AA Nyeri', 'Bold and complex. Blackcurrant, grapefruit, and brown sugar.',
   15.50, 15.50, '250g', 'both', 10.50, 9.00, 7.80, 5, true, true, 4),

  ('d1000001-0001-4000-8000-000000000005', '0f15f667-f15e-4e29-9307-05a41cd5c311',
   'House Blend 1kg', 'Our signature blend in bulk. Perfect for high-volume accounts.',
   38.00, 38.00, '1kg', 'wholesale', 28.00, 24.00, 21.00, 2, true, true, 5),

  ('d1000001-0001-4000-8000-000000000006', '0f15f667-f15e-4e29-9307-05a41cd5c311',
   'Espresso Blend', 'Designed for espresso. Brazil and Colombia. Rich crema, toffee, cocoa.',
   13.50, 13.50, '250g', 'both', 9.20, 8.00, 6.80, 5, true, true, 6)
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 2. CREATE PEOPLE (CUSTOMERS) FOR TEST ROASTER
-- ============================================================================

INSERT INTO public.people (id, email, first_name, last_name) VALUES
  ('c1000001-0001-4000-8000-000000000001', 'sarah.mitchell@thepourovercafe.co.uk', 'Sarah', 'Mitchell'),
  ('c1000001-0001-4000-8000-000000000002', 'tom.bradley@copperkettle.co.uk', 'Tom', 'Bradley'),
  ('c1000001-0001-4000-8000-000000000003', 'nina.patel@morningglory.co.uk', 'Nina', 'Patel'),
  ('c1000001-0001-4000-8000-000000000004', 'mark.jones@urbangrind.co.uk', 'Mark', 'Jones'),
  ('c1000001-0001-4000-8000-000000000005', 'rachel.ward@deskandbean.co.uk', 'Rachel', 'Ward'),
  ('c1000001-0001-4000-8000-000000000006', 'olivia.chen@bloomcafe.co.uk', 'Olivia', 'Chen')
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 3. CREATE AUTH USERS FOR WHOLESALE BUYERS
-- ============================================================================

-- We need users in auth.users for wholesale_access.user_id
-- Using Supabase's raw_user_meta_data approach
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, aud, role)
VALUES
  ('c1000001-0001-4000-8000-100000000001', '00000000-0000-0000-0000-000000000000',
   'sarah.mitchell@thepourovercafe.co.uk', crypt('testpassword123!', gen_salt('bf')),
   now(), '{"full_name": "Sarah Mitchell"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),

  ('c1000001-0001-4000-8000-100000000002', '00000000-0000-0000-0000-000000000000',
   'tom.bradley@copperkettle.co.uk', crypt('testpassword123!', gen_salt('bf')),
   now(), '{"full_name": "Tom Bradley"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),

  ('c1000001-0001-4000-8000-100000000003', '00000000-0000-0000-0000-000000000000',
   'nina.patel@morningglory.co.uk', crypt('testpassword123!', gen_salt('bf')),
   now(), '{"full_name": "Nina Patel"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),

  ('c1000001-0001-4000-8000-100000000004', '00000000-0000-0000-0000-000000000000',
   'mark.jones@urbangrind.co.uk', crypt('testpassword123!', gen_salt('bf')),
   now(), '{"full_name": "Mark Jones"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),

  ('c1000001-0001-4000-8000-100000000005', '00000000-0000-0000-0000-000000000000',
   'rachel.ward@deskandbean.co.uk', crypt('testpassword123!', gen_salt('bf')),
   now(), '{"full_name": "Rachel Ward"}'::jsonb, now(), now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- Users table entries
INSERT INTO public.users (id, email, full_name) VALUES
  ('c1000001-0001-4000-8000-100000000001', 'sarah.mitchell@thepourovercafe.co.uk', 'Sarah Mitchell'),
  ('c1000001-0001-4000-8000-100000000002', 'tom.bradley@copperkettle.co.uk', 'Tom Bradley'),
  ('c1000001-0001-4000-8000-100000000003', 'nina.patel@morningglory.co.uk', 'Nina Patel'),
  ('c1000001-0001-4000-8000-100000000004', 'mark.jones@urbangrind.co.uk', 'Mark Jones'),
  ('c1000001-0001-4000-8000-100000000005', 'rachel.ward@deskandbean.co.uk', 'Rachel Ward')
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 4. CREATE BUSINESSES FOR TEST ROASTER
-- ============================================================================

INSERT INTO public.businesses (id, roaster_id, name, types, industry, status, email, phone, address_line_1, city, postcode, country, source) VALUES
  ('b1000001-0001-4000-8000-000000000001', '0f15f667-f15e-4e29-9307-05a41cd5c311',
   'The Pour Over Café', ARRAY['customer']::text[], 'cafe', 'active',
   'sarah.mitchell@thepourovercafe.co.uk', '0161 234 5678',
   '12 Northern Quarter', 'Manchester', 'M1 1JR', 'UK', 'wholesale_application'),

  ('b1000001-0001-4000-8000-000000000002', '0f15f667-f15e-4e29-9307-05a41cd5c311',
   'Copper Kettle Restaurant', ARRAY['customer']::text[], 'restaurant', 'active',
   'tom.bradley@copperkettle.co.uk', '0113 456 7890',
   '88 The Calls', 'Leeds', 'LS2 7EW', 'UK', 'wholesale_application'),

  ('b1000001-0001-4000-8000-000000000003', '0f15f667-f15e-4e29-9307-05a41cd5c311',
   'Morning Glory Coffee', ARRAY['customer']::text[], 'cafe', 'active',
   'nina.patel@morningglory.co.uk', '0114 567 8901',
   '5 Ecclesall Road', 'Sheffield', 'S11 8PR', 'UK', 'wholesale_application'),

  ('b1000001-0001-4000-8000-000000000004', '0f15f667-f15e-4e29-9307-05a41cd5c311',
   'Urban Grind', ARRAY['customer']::text[], 'cafe', 'active',
   'mark.jones@urbangrind.co.uk', '0151 234 5678',
   '22 Bold Street', 'Liverpool', 'L1 4DS', 'UK', 'wholesale_application'),

  ('b1000001-0001-4000-8000-000000000005', '0f15f667-f15e-4e29-9307-05a41cd5c311',
   'Desk & Bean Co-Working', ARRAY['customer']::text[], 'coworking', 'active',
   'rachel.ward@deskandbean.co.uk', '0117 890 1234',
   '45 Stokes Croft', 'Bristol', 'BS1 3QY', 'UK', 'wholesale_application')
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 5. CREATE WHOLESALE ACCESS FOR TEST ROASTER
-- ============================================================================

INSERT INTO public.wholesale_access (id, user_id, roaster_id, status, business_name, business_type, price_tier, payment_terms, business_id, approved_at) VALUES
  ('aa000001-0001-4000-8000-000000000001',
   'c1000001-0001-4000-8000-100000000001', '0f15f667-f15e-4e29-9307-05a41cd5c311',
   'approved', 'The Pour Over Café', 'cafe', 'preferred', 'net14',
   'b1000001-0001-4000-8000-000000000001', now() - interval '2 months'),

  ('aa000001-0001-4000-8000-000000000002',
   'c1000001-0001-4000-8000-100000000002', '0f15f667-f15e-4e29-9307-05a41cd5c311',
   'approved', 'Copper Kettle Restaurant', 'restaurant', 'standard', 'net30',
   'b1000001-0001-4000-8000-000000000002', now() - interval '3 months'),

  ('aa000001-0001-4000-8000-000000000003',
   'c1000001-0001-4000-8000-100000000003', '0f15f667-f15e-4e29-9307-05a41cd5c311',
   'approved', 'Morning Glory Coffee', 'cafe', 'vip', 'net14',
   'b1000001-0001-4000-8000-000000000003', now() - interval '6 months'),

  ('aa000001-0001-4000-8000-000000000004',
   'c1000001-0001-4000-8000-100000000004', '0f15f667-f15e-4e29-9307-05a41cd5c311',
   'approved', 'Urban Grind', 'cafe', 'standard', 'prepay',
   'b1000001-0001-4000-8000-000000000004', now() - interval '1 month'),

  ('aa000001-0001-4000-8000-000000000005',
   'c1000001-0001-4000-8000-100000000005', '0f15f667-f15e-4e29-9307-05a41cd5c311',
   'approved', 'Desk & Bean Co-Working', 'other', 'preferred', 'net30',
   'b1000001-0001-4000-8000-000000000005', now() - interval '4 months')
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 6. GHOST ROASTERY / RETAIL ORDERS (orders table)
--    These are white-label private-label orders routed to Test Roaster
-- ============================================================================

-- Order 1: DELIVERED — paid, fulfilled, ready for payout
INSERT INTO public.orders (id, customer_email, customer_name, bag_colour, bag_size, roast_profile, grind, quantity, price_per_bag, total_price, brand_name, partner_roaster_id, delivery_address, stripe_payment_id, payment_status, order_status, partner_payout_total, payout_status, created_at)
VALUES (
  'e1000001-0001-4000-8000-000000000001',
  'olivia.chen@bloomcafe.co.uk', 'Olivia Chen',
  'White Kraft', '250g', 'Light Roast', 'Whole Bean', 24, 9.50, 228.00,
  'Bloom Café Roast', '0f15f667-f15e-4e29-9307-05a41cd5c311',
  '{"name": "Olivia Chen", "line1": "7 Chapel Allerton", "city": "Leeds", "country": "GB", "postal_code": "LS7 4NY"}'::jsonb,
  'pi_seed_test_001', 'paid', 'Delivered', 196.08, 'unpaid',
  now() - interval '12 days'
);

-- Order 2: DISPATCHED — paid, shipped, not yet delivered
INSERT INTO public.orders (id, customer_email, customer_name, bag_colour, bag_size, roast_profile, grind, quantity, price_per_bag, total_price, brand_name, partner_roaster_id, delivery_address, stripe_payment_id, payment_status, order_status, partner_payout_total, payout_status, created_at)
VALUES (
  'e1000001-0001-4000-8000-000000000002',
  'mark.jones@urbangrind.co.uk', 'Mark Jones',
  'Black Matt', '250g', 'Medium Roast', 'Espresso Fine', 36, 9.50, 342.00,
  'Urban Grind Original', '0f15f667-f15e-4e29-9307-05a41cd5c311',
  '{"name": "Mark Jones", "line1": "22 Bold Street", "city": "Liverpool", "country": "GB", "postal_code": "L1 4DS"}'::jsonb,
  'pi_seed_test_002', 'paid', 'Dispatched', 294.12, 'unpaid',
  now() - interval '5 days'
);

-- Order 3: IN PRODUCTION — paid, being roasted
INSERT INTO public.orders (id, customer_email, customer_name, bag_colour, bag_size, roast_profile, grind, quantity, price_per_bag, total_price, brand_name, partner_roaster_id, delivery_address, stripe_payment_id, payment_status, order_status, partner_payout_total, payout_status, created_at)
VALUES (
  'e1000001-0001-4000-8000-000000000003',
  'sarah.mitchell@thepourovercafe.co.uk', 'Sarah Mitchell',
  'Navy Blue', '500g', 'Dark Roast', 'Coarse', 15, 17.00, 255.00,
  'Pour Over House Blend', '0f15f667-f15e-4e29-9307-05a41cd5c311',
  '{"name": "Sarah Mitchell", "line1": "12 Northern Quarter", "city": "Manchester", "country": "GB", "postal_code": "M1 1JR"}'::jsonb,
  'pi_seed_test_003', 'paid', 'In Production', 219.30, 'unpaid',
  now() - interval '2 days'
);

-- Order 4: PENDING — paid, awaiting production start
INSERT INTO public.orders (id, customer_email, customer_name, bag_colour, bag_size, roast_profile, grind, quantity, price_per_bag, total_price, brand_name, partner_roaster_id, delivery_address, stripe_payment_id, payment_status, order_status, partner_payout_total, payout_status, created_at)
VALUES (
  'e1000001-0001-4000-8000-000000000004',
  'rachel.ward@deskandbean.co.uk', 'Rachel Ward',
  'Sage Green', '250g', 'Medium Roast', 'Whole Bean', 20, 9.50, 190.00,
  'Desk & Bean Daily', '0f15f667-f15e-4e29-9307-05a41cd5c311',
  '{"name": "Rachel Ward", "line1": "45 Stokes Croft", "city": "Bristol", "country": "GB", "postal_code": "BS1 3QY"}'::jsonb,
  'pi_seed_test_004', 'paid', 'Pending', 163.40, 'unpaid',
  now() - interval '1 day'
);

-- Order 5: DELIVERED — older order, already paid out (for history)
INSERT INTO public.orders (id, customer_email, customer_name, bag_colour, bag_size, roast_profile, grind, quantity, price_per_bag, total_price, brand_name, partner_roaster_id, delivery_address, stripe_payment_id, payment_status, order_status, partner_payout_total, payout_status, created_at)
VALUES (
  'e1000001-0001-4000-8000-000000000005',
  'tom.bradley@copperkettle.co.uk', 'Tom Bradley',
  'Black Matt', '1kg', 'Medium Roast', 'Whole Bean', 10, 32.00, 320.00,
  'Copper Kettle Signature', '0f15f667-f15e-4e29-9307-05a41cd5c311',
  '{"name": "Tom Bradley", "line1": "88 The Calls", "city": "Leeds", "country": "GB", "postal_code": "LS2 7EW"}'::jsonb,
  'pi_seed_test_005', 'paid', 'Delivered', 275.20, 'unpaid',
  now() - interval '25 days'
);

-- Order 6: DELIVERED — another completed order
INSERT INTO public.orders (id, customer_email, customer_name, bag_colour, bag_size, roast_profile, grind, quantity, price_per_bag, total_price, brand_name, partner_roaster_id, delivery_address, stripe_payment_id, payment_status, order_status, partner_payout_total, payout_status, created_at)
VALUES (
  'e1000001-0001-4000-8000-000000000006',
  'nina.patel@morningglory.co.uk', 'Nina Patel',
  'White Kraft', '250g', 'Light Roast', 'Pour Over', 30, 9.50, 285.00,
  'Morning Glory Sunrise', '0f15f667-f15e-4e29-9307-05a41cd5c311',
  '{"name": "Nina Patel", "line1": "5 Ecclesall Road", "city": "Sheffield", "country": "GB", "postal_code": "S11 8PR"}'::jsonb,
  'pi_seed_test_006', 'paid', 'Delivered', 245.10, 'unpaid',
  now() - interval '18 days'
);


-- ============================================================================
-- 7. WHOLESALE ORDERS (wholesale_orders table)
--    Placed through Test Roaster's wholesale portal
-- ============================================================================

-- Wholesale 1: PAID via Stripe (prepay) — completed, Urban Grind
INSERT INTO public.wholesale_orders (id, roaster_id, customer_name, customer_email, delivery_address, items, subtotal, platform_fee, roaster_payout, stripe_payment_id, status, user_id, payment_method, payment_terms, created_at)
VALUES (
  'f1000001-0001-4000-8000-000000000001',
  '0f15f667-f15e-4e29-9307-05a41cd5c311',
  'Mark Jones', 'mark.jones@urbangrind.co.uk',
  '{"line1": "22 Bold Street", "city": "Liverpool", "postcode": "L1 4DS", "country": "GB"}'::jsonb,
  '[{"productId": "d1000001-0001-4000-8000-000000000003", "name": "House Blend", "unitAmount": 800, "quantity": 10, "unit": "250g"},
    {"productId": "d1000001-0001-4000-8000-000000000006", "name": "Espresso Blend", "unitAmount": 920, "quantity": 8, "unit": "250g"}]'::jsonb,
  153.60, 6.14, 147.46, 'pi_seed_ws_001', 'paid',
  'c1000001-0001-4000-8000-100000000004', 'stripe', 'prepay',
  now() - interval '20 days'
);

-- Wholesale 2: CONFIRMED via invoice — net14, The Pour Over Café (preferred tier)
INSERT INTO public.wholesale_orders (id, roaster_id, customer_name, customer_email, delivery_address, items, subtotal, platform_fee, roaster_payout, status, user_id, payment_method, payment_terms, created_at)
VALUES (
  'f1000001-0001-4000-8000-000000000002',
  '0f15f667-f15e-4e29-9307-05a41cd5c311',
  'Sarah Mitchell', 'sarah.mitchell@thepourovercafe.co.uk',
  '{"line1": "12 Northern Quarter", "city": "Manchester", "postcode": "M1 1JR", "country": "GB"}'::jsonb,
  '[{"productId": "d1000001-0001-4000-8000-000000000001", "name": "Ethiopian Yirgacheffe", "unitAmount": 850, "quantity": 12, "unit": "250g"},
    {"productId": "d1000001-0001-4000-8000-000000000003", "name": "House Blend", "unitAmount": 700, "quantity": 20, "unit": "250g"},
    {"productId": "d1000001-0001-4000-8000-000000000002", "name": "Colombian Huila Decaf", "unitAmount": 750, "quantity": 6, "unit": "250g"}]'::jsonb,
  287.00, 11.48, 275.52, 'confirmed',
  'c1000001-0001-4000-8000-100000000001', 'invoice_online', 'net14',
  now() - interval '10 days'
);

-- Wholesale 3: CONFIRMED via invoice — net30, Copper Kettle (standard tier)
INSERT INTO public.wholesale_orders (id, roaster_id, customer_name, customer_email, delivery_address, items, subtotal, platform_fee, roaster_payout, status, user_id, payment_method, payment_terms, created_at)
VALUES (
  'f1000001-0001-4000-8000-000000000003',
  '0f15f667-f15e-4e29-9307-05a41cd5c311',
  'Tom Bradley', 'tom.bradley@copperkettle.co.uk',
  '{"line1": "88 The Calls", "city": "Leeds", "postcode": "LS2 7EW", "country": "GB"}'::jsonb,
  '[{"productId": "d1000001-0001-4000-8000-000000000005", "name": "House Blend 1kg", "unitAmount": 2800, "quantity": 4, "unit": "1kg"},
    {"productId": "d1000001-0001-4000-8000-000000000004", "name": "Kenyan AA Nyeri", "unitAmount": 1050, "quantity": 10, "unit": "250g"}]'::jsonb,
  217.00, 8.68, 208.32, 'confirmed',
  'c1000001-0001-4000-8000-100000000002', 'invoice_online', 'net30',
  now() - interval '7 days'
);

-- Wholesale 4: PAID via Stripe — completed, Morning Glory (VIP tier)
INSERT INTO public.wholesale_orders (id, roaster_id, customer_name, customer_email, delivery_address, items, subtotal, platform_fee, roaster_payout, stripe_payment_id, status, user_id, payment_method, payment_terms, created_at)
VALUES (
  'f1000001-0001-4000-8000-000000000004',
  '0f15f667-f15e-4e29-9307-05a41cd5c311',
  'Nina Patel', 'nina.patel@morningglory.co.uk',
  '{"line1": "5 Ecclesall Road", "city": "Sheffield", "postcode": "S11 8PR", "country": "GB"}'::jsonb,
  '[{"productId": "d1000001-0001-4000-8000-000000000001", "name": "Ethiopian Yirgacheffe", "unitAmount": 720, "quantity": 15, "unit": "250g"},
    {"productId": "d1000001-0001-4000-8000-000000000006", "name": "Espresso Blend", "unitAmount": 680, "quantity": 20, "unit": "250g"},
    {"productId": "d1000001-0001-4000-8000-000000000002", "name": "Colombian Huila Decaf", "unitAmount": 650, "quantity": 10, "unit": "250g"}]'::jsonb,
  310.00, 12.40, 297.60, 'pi_seed_ws_004', 'paid',
  'c1000001-0001-4000-8000-100000000003', 'stripe', 'prepay',
  now() - interval '15 days'
);

-- Wholesale 5: CONFIRMED via invoice — net14, Morning Glory reorder (VIP)
INSERT INTO public.wholesale_orders (id, roaster_id, customer_name, customer_email, delivery_address, items, subtotal, platform_fee, roaster_payout, status, user_id, payment_method, payment_terms, created_at)
VALUES (
  'f1000001-0001-4000-8000-000000000005',
  '0f15f667-f15e-4e29-9307-05a41cd5c311',
  'Nina Patel', 'nina.patel@morningglory.co.uk',
  '{"line1": "5 Ecclesall Road", "city": "Sheffield", "postcode": "S11 8PR", "country": "GB"}'::jsonb,
  '[{"productId": "d1000001-0001-4000-8000-000000000005", "name": "House Blend 1kg", "unitAmount": 2100, "quantity": 6, "unit": "1kg"},
    {"productId": "d1000001-0001-4000-8000-000000000004", "name": "Kenyan AA Nyeri", "unitAmount": 780, "quantity": 10, "unit": "250g"}]'::jsonb,
  204.00, 8.16, 195.84, 'confirmed',
  'c1000001-0001-4000-8000-100000000003', 'invoice_online', 'net14',
  now() - interval '3 days'
);

-- Wholesale 6: PENDING — new order just placed, Desk & Bean (net30)
INSERT INTO public.wholesale_orders (id, roaster_id, customer_name, customer_email, delivery_address, items, subtotal, platform_fee, roaster_payout, status, user_id, payment_method, payment_terms, created_at)
VALUES (
  'f1000001-0001-4000-8000-000000000006',
  '0f15f667-f15e-4e29-9307-05a41cd5c311',
  'Rachel Ward', 'rachel.ward@deskandbean.co.uk',
  '{"line1": "45 Stokes Croft", "city": "Bristol", "postcode": "BS1 3QY", "country": "GB"}'::jsonb,
  '[{"productId": "d1000001-0001-4000-8000-000000000003", "name": "House Blend", "unitAmount": 700, "quantity": 30, "unit": "250g"},
    {"productId": "d1000001-0001-4000-8000-000000000002", "name": "Colombian Huila Decaf", "unitAmount": 750, "quantity": 10, "unit": "250g"}]'::jsonb,
  285.00, 11.40, 273.60, 'confirmed',
  'c1000001-0001-4000-8000-100000000005', 'invoice_online', 'net30',
  now() - interval '1 day'
);

-- Wholesale 7: PAID via Stripe — old completed order, Brim Coffee (existing buyer)
INSERT INTO public.wholesale_orders (id, roaster_id, customer_name, customer_email, delivery_address, items, subtotal, platform_fee, roaster_payout, stripe_payment_id, status, user_id, payment_method, payment_terms, created_at)
VALUES (
  'f1000001-0001-4000-8000-000000000007',
  '0f15f667-f15e-4e29-9307-05a41cd5c311',
  'James Harper', 'james@brimcoffeehouse.co.uk',
  '{"line1": "14 High Street", "city": "York", "postcode": "YO1 7EN", "country": "GB"}'::jsonb,
  '[{"productId": "d1000001-0001-4000-8000-000000000001", "name": "Ethiopian Yirgacheffe", "unitAmount": 850, "quantity": 8, "unit": "250g"},
    {"productId": "d1000001-0001-4000-8000-000000000003", "name": "House Blend", "unitAmount": 700, "quantity": 15, "unit": "250g"}]'::jsonb,
  173.00, 6.92, 166.08, 'pi_seed_ws_007', 'paid',
  'd715602a-5a79-4ea0-a7c2-76b28cca3a7c', 'stripe', 'prepay',
  now() - interval '30 days'
);


-- ============================================================================
-- 8. PLATFORM FEE LEDGER ENTRIES (for the paid orders)
-- ============================================================================

-- Retail orders routed to Test Roaster (ghost_roastery type)
INSERT INTO public.platform_fee_ledger (roaster_id, order_type, reference_id, gross_amount, fee_amount, net_to_roaster, currency, stripe_payment_id, status) VALUES
  ('0f15f667-f15e-4e29-9307-05a41cd5c311', 'ghost_roastery', 'e1000001-0001-4000-8000-000000000001', 228.00, 31.92, 196.08, 'GBP', 'pi_seed_test_001', 'collected'),
  ('0f15f667-f15e-4e29-9307-05a41cd5c311', 'ghost_roastery', 'e1000001-0001-4000-8000-000000000002', 342.00, 47.88, 294.12, 'GBP', 'pi_seed_test_002', 'collected'),
  ('0f15f667-f15e-4e29-9307-05a41cd5c311', 'ghost_roastery', 'e1000001-0001-4000-8000-000000000003', 255.00, 35.70, 219.30, 'GBP', 'pi_seed_test_003', 'collected'),
  ('0f15f667-f15e-4e29-9307-05a41cd5c311', 'ghost_roastery', 'e1000001-0001-4000-8000-000000000004', 190.00, 26.60, 163.40, 'GBP', 'pi_seed_test_004', 'collected'),
  ('0f15f667-f15e-4e29-9307-05a41cd5c311', 'ghost_roastery', 'e1000001-0001-4000-8000-000000000005', 320.00, 44.80, 275.20, 'GBP', 'pi_seed_test_005', 'collected'),
  ('0f15f667-f15e-4e29-9307-05a41cd5c311', 'ghost_roastery', 'e1000001-0001-4000-8000-000000000006', 285.00, 39.90, 245.10, 'GBP', 'pi_seed_test_006', 'collected')
ON CONFLICT DO NOTHING;

-- Wholesale orders via storefront (storefront type)
INSERT INTO public.platform_fee_ledger (roaster_id, order_type, reference_id, gross_amount, fee_amount, fee_percent, net_to_roaster, currency, stripe_payment_id, status) VALUES
  ('0f15f667-f15e-4e29-9307-05a41cd5c311', 'storefront', 'f1000001-0001-4000-8000-000000000001', 153.60, 6.14, 4.0, 147.46, 'GBP', 'pi_seed_ws_001', 'collected'),
  ('0f15f667-f15e-4e29-9307-05a41cd5c311', 'storefront', 'f1000001-0001-4000-8000-000000000004', 310.00, 12.40, 4.0, 297.60, 'GBP', 'pi_seed_ws_004', 'collected'),
  ('0f15f667-f15e-4e29-9307-05a41cd5c311', 'storefront', 'f1000001-0001-4000-8000-000000000007', 173.00, 6.92, 4.0, 166.08, 'GBP', 'pi_seed_ws_007', 'collected')
ON CONFLICT DO NOTHING;

-- Invoice-based wholesale orders (pending fee collection)
INSERT INTO public.platform_fee_ledger (roaster_id, order_type, reference_id, gross_amount, fee_amount, fee_percent, net_to_roaster, currency, status) VALUES
  ('0f15f667-f15e-4e29-9307-05a41cd5c311', 'storefront', 'f1000001-0001-4000-8000-000000000002', 287.00, 11.48, 4.0, 275.52, 'GBP', 'pending'),
  ('0f15f667-f15e-4e29-9307-05a41cd5c311', 'storefront', 'f1000001-0001-4000-8000-000000000003', 217.00, 8.68, 4.0, 208.32, 'GBP', 'pending'),
  ('0f15f667-f15e-4e29-9307-05a41cd5c311', 'storefront', 'f1000001-0001-4000-8000-000000000005', 204.00, 8.16, 4.0, 195.84, 'GBP', 'pending'),
  ('0f15f667-f15e-4e29-9307-05a41cd5c311', 'storefront', 'f1000001-0001-4000-8000-000000000006', 285.00, 11.40, 4.0, 273.60, 'GBP', 'pending')
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 9. INVOICES FOR THE NET-TERMS WHOLESALE ORDERS
-- ============================================================================

-- Invoice for Pour Over Café order (net14, due soon)
INSERT INTO public.invoices (id, invoice_number, owner_type, roaster_id, buyer_id, customer_id, business_id, order_ids, subtotal, discount_amount, tax_rate, tax_amount, total, amount_paid, amount_due, currency, payment_method, payment_status, status, due_days, payment_due_date, invoice_access_token, issued_date, sent_at, notes, platform_fee_percent, platform_fee_amount, created_at)
VALUES (
  'a0f00001-0001-4000-8000-000000000001',
  'INV-0001', 'roaster', '0f15f667-f15e-4e29-9307-05a41cd5c311',
  'c1000001-0001-4000-8000-100000000001', 'c1000001-0001-4000-8000-000000000001', 'b1000001-0001-4000-8000-000000000001',
  ARRAY['f1000001-0001-4000-8000-000000000002']::uuid[],
  287.00, 0, 0, 0, 287.00, 0, 287.00, 'GBP', 'invoice_offline', 'unpaid', 'sent',
  14, (now() - interval '10 days' + interval '14 days')::date,
  'acc-token-pour-over-001', (now() - interval '10 days')::date, now() - interval '10 days',
  'Thank you for your order. Payment due within 14 days.', 4.0, 11.48,
  now() - interval '10 days'
);

-- Line items for Pour Over invoice
INSERT INTO public.invoice_line_items (invoice_id, description, quantity, unit_price, total, sort_order) VALUES
  ('a0f00001-0001-4000-8000-000000000001', 'Ethiopian Yirgacheffe (250g) × 12', 12, 8.50, 102.00, 0),
  ('a0f00001-0001-4000-8000-000000000001', 'House Blend (250g) × 20', 20, 7.00, 140.00, 1),
  ('a0f00001-0001-4000-8000-000000000001', 'Colombian Huila Decaf (250g) × 6', 6, 7.50, 45.00, 2);


-- Invoice for Copper Kettle order (net30, plenty of time)
INSERT INTO public.invoices (id, invoice_number, owner_type, roaster_id, buyer_id, customer_id, business_id, order_ids, subtotal, discount_amount, tax_rate, tax_amount, total, amount_paid, amount_due, currency, payment_method, payment_status, status, due_days, payment_due_date, invoice_access_token, issued_date, sent_at, notes, platform_fee_percent, platform_fee_amount, created_at)
VALUES (
  'a0f00001-0001-4000-8000-000000000002',
  'INV-0002', 'roaster', '0f15f667-f15e-4e29-9307-05a41cd5c311',
  'c1000001-0001-4000-8000-100000000002', 'c1000001-0001-4000-8000-000000000002', 'b1000001-0001-4000-8000-000000000002',
  ARRAY['f1000001-0001-4000-8000-000000000003']::uuid[],
  217.00, 0, 0, 0, 217.00, 0, 217.00, 'GBP', 'invoice_offline', 'unpaid', 'sent',
  30, (now() - interval '7 days' + interval '30 days')::date,
  'acc-token-copper-kettle-002', (now() - interval '7 days')::date, now() - interval '7 days',
  'Thank you for your order. Payment due within 30 days.', 4.0, 8.68,
  now() - interval '7 days'
);

INSERT INTO public.invoice_line_items (invoice_id, description, quantity, unit_price, total, sort_order) VALUES
  ('a0f00001-0001-4000-8000-000000000002', 'House Blend 1kg × 4', 4, 28.00, 112.00, 0),
  ('a0f00001-0001-4000-8000-000000000002', 'Kenyan AA Nyeri (250g) × 10', 10, 10.50, 105.00, 1);


-- Invoice for Morning Glory reorder (net14, recent)
INSERT INTO public.invoices (id, invoice_number, owner_type, roaster_id, buyer_id, customer_id, business_id, order_ids, subtotal, discount_amount, tax_rate, tax_amount, total, amount_paid, amount_due, currency, payment_method, payment_status, status, due_days, payment_due_date, invoice_access_token, issued_date, sent_at, notes, platform_fee_percent, platform_fee_amount, created_at)
VALUES (
  'a0f00001-0001-4000-8000-000000000003',
  'INV-0003', 'roaster', '0f15f667-f15e-4e29-9307-05a41cd5c311',
  'c1000001-0001-4000-8000-100000000003', 'c1000001-0001-4000-8000-000000000003', 'b1000001-0001-4000-8000-000000000003',
  ARRAY['f1000001-0001-4000-8000-000000000005']::uuid[],
  204.00, 0, 0, 0, 204.00, 0, 204.00, 'GBP', 'invoice_offline', 'unpaid', 'sent',
  14, (now() - interval '3 days' + interval '14 days')::date,
  'acc-token-morning-glory-003', (now() - interval '3 days')::date, now() - interval '3 days',
  'VIP account — thank you for your continued business.', 4.0, 8.16,
  now() - interval '3 days'
);

INSERT INTO public.invoice_line_items (invoice_id, description, quantity, unit_price, total, sort_order) VALUES
  ('a0f00001-0001-4000-8000-000000000003', 'House Blend 1kg × 6', 6, 21.00, 126.00, 0),
  ('a0f00001-0001-4000-8000-000000000003', 'Kenyan AA Nyeri (250g) × 10', 10, 7.80, 78.00, 1);


-- Invoice for Desk & Bean (net30, brand new)
INSERT INTO public.invoices (id, invoice_number, owner_type, roaster_id, buyer_id, customer_id, business_id, order_ids, subtotal, discount_amount, tax_rate, tax_amount, total, amount_paid, amount_due, currency, payment_method, payment_status, status, due_days, payment_due_date, invoice_access_token, issued_date, sent_at, notes, platform_fee_percent, platform_fee_amount, created_at)
VALUES (
  'a0f00001-0001-4000-8000-000000000004',
  'INV-0004', 'roaster', '0f15f667-f15e-4e29-9307-05a41cd5c311',
  'c1000001-0001-4000-8000-100000000005', 'c1000001-0001-4000-8000-000000000005', 'b1000001-0001-4000-8000-000000000005',
  ARRAY['f1000001-0001-4000-8000-000000000006']::uuid[],
  285.00, 0, 0, 0, 285.00, 0, 285.00, 'GBP', 'invoice_offline', 'unpaid', 'draft',
  30, (now() - interval '1 day' + interval '30 days')::date,
  'acc-token-desk-bean-004', NULL, NULL,
  'New wholesale account. First order.', 4.0, 11.40,
  now() - interval '1 day'
);

INSERT INTO public.invoice_line_items (invoice_id, description, quantity, unit_price, total, sort_order) VALUES
  ('a0f00001-0001-4000-8000-000000000004', 'House Blend (250g) × 30', 30, 7.00, 210.00, 0),
  ('a0f00001-0001-4000-8000-000000000004', 'Colombian Huila Decaf (250g) × 10', 10, 7.50, 75.00, 1);


-- Invoice for a PAID old Brim Coffee order (for history / partially paid testing)
INSERT INTO public.invoices (id, invoice_number, owner_type, roaster_id, buyer_id, customer_id, business_id, order_ids, subtotal, discount_amount, tax_rate, tax_amount, total, amount_paid, amount_due, currency, payment_method, payment_status, status, due_days, payment_due_date, invoice_access_token, issued_date, sent_at, paid_at, notes, platform_fee_percent, platform_fee_amount, created_at)
VALUES (
  'a0f00001-0001-4000-8000-000000000005',
  'INV-0005', 'roaster', '0f15f667-f15e-4e29-9307-05a41cd5c311',
  'd715602a-5a79-4ea0-a7c2-76b28cca3a7c', '55be1dab-23e5-4344-8d82-3eb5ac8fd4e4', NULL,
  ARRAY['f1000001-0001-4000-8000-000000000007']::uuid[],
  173.00, 0, 0, 0, 173.00, 173.00, 0, 'GBP', 'invoice_offline', 'paid', 'paid',
  14, (now() - interval '30 days' + interval '14 days')::date,
  'acc-token-brim-coffee-005', (now() - interval '30 days')::date, now() - interval '30 days', now() - interval '18 days',
  'Paid via bank transfer.', 4.0, 6.92,
  now() - interval '30 days'
);

INSERT INTO public.invoice_line_items (invoice_id, description, quantity, unit_price, total, sort_order) VALUES
  ('a0f00001-0001-4000-8000-000000000005', 'Ethiopian Yirgacheffe (250g) × 8', 8, 8.50, 68.00, 0),
  ('a0f00001-0001-4000-8000-000000000005', 'House Blend (250g) × 15', 15, 7.00, 105.00, 1);

-- Payment record for the paid Brim Coffee invoice
INSERT INTO public.invoice_payments (invoice_id, amount, payment_method, reference, notes, paid_at) VALUES
  ('a0f00001-0001-4000-8000-000000000005', 173.00, 'bank_transfer', 'BACS-REF-7823', 'Paid via BACS transfer', now() - interval '18 days');


-- Update invoice sequences to reflect the invoices we created
UPDATE public.invoice_sequences SET last_number = 5 WHERE roaster_id = '0f15f667-f15e-4e29-9307-05a41cd5c311';
-- Create sequence row if it doesn't exist
INSERT INTO public.invoice_sequences (roaster_id, last_number) VALUES ('0f15f667-f15e-4e29-9307-05a41cd5c311', 5)
ON CONFLICT DO NOTHING;
