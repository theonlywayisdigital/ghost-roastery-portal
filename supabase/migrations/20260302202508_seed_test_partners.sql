-- ============================================================
-- Seed: 3 test partner roasters (UK, Australia, Thailand)
-- Each with: auth user (owner + staff), people, profiles,
--   partner_roasters, user_roles, team_members, territories,
--   rates, and approved applications.
-- ============================================================

BEGIN;

-- ── Fixed UUIDs for reproducibility ──────────────────────────

-- UK Partner: Brew & Barrel Roasters (London)
DO $$
DECLARE
  v_uk_owner_id      uuid := 'a1000001-0001-4000-8000-000000000001';
  v_uk_staff_id      uuid := 'a1000001-0001-4000-8000-000000000002';
  v_uk_roaster_id    uuid := 'a1000001-0001-4000-8000-000000000010';
  v_uk_people_owner  uuid := 'a1000001-0001-4000-8000-000000000021';
  v_uk_people_staff  uuid := 'a1000001-0001-4000-8000-000000000022';

  -- AU Partner: Southern Cross Coffee Co (Melbourne)
  v_au_owner_id      uuid := 'a2000002-0002-4000-8000-000000000001';
  v_au_staff_id      uuid := 'a2000002-0002-4000-8000-000000000002';
  v_au_roaster_id    uuid := 'a2000002-0002-4000-8000-000000000010';
  v_au_people_owner  uuid := 'a2000002-0002-4000-8000-000000000021';
  v_au_people_staff  uuid := 'a2000002-0002-4000-8000-000000000022';

  -- TH Partner: Chiang Mai Mountain Roast (Chiang Mai)
  v_th_owner_id      uuid := 'a3000003-0003-4000-8000-000000000001';
  v_th_staff_id      uuid := 'a3000003-0003-4000-8000-000000000002';
  v_th_roaster_id    uuid := 'a3000003-0003-4000-8000-000000000010';
  v_th_people_owner  uuid := 'a3000003-0003-4000-8000-000000000021';
  v_th_people_staff  uuid := 'a3000003-0003-4000-8000-000000000022';

  v_password_hash    text := '$2a$10$PwIbcXGRCKh.0Bv5YqQ0oeSGxGvJ8HjNXkLNPMUk0jlG1LR3E0YnK'; -- "TestPassword123!"
BEGIN

  -- ════════════════════════════════════════════════════════════
  -- 1. AUTH USERS (owner + staff per roaster)
  -- ════════════════════════════════════════════════════════════

  -- UK Owner
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, confirmation_token, recovery_token, created_at, updated_at, raw_user_meta_data)
  VALUES (
    v_uk_owner_id, '00000000-0000-0000-0000-000000000000',
    'james@brewandbarrel.co.uk', v_password_hash,
    now(), 'authenticated', 'authenticated', '', '', now(), now(),
    '{"full_name": "James Whitfield"}'::jsonb
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    v_uk_owner_id, v_uk_owner_id, 'james@brewandbarrel.co.uk',
    jsonb_build_object('sub', v_uk_owner_id::text, 'email', 'james@brewandbarrel.co.uk'),
    'email', now(), now(), now()
  ) ON CONFLICT (provider_id, provider) DO NOTHING;

  -- UK Staff
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, confirmation_token, recovery_token, created_at, updated_at, raw_user_meta_data)
  VALUES (
    v_uk_staff_id, '00000000-0000-0000-0000-000000000000',
    'emma@brewandbarrel.co.uk', v_password_hash,
    now(), 'authenticated', 'authenticated', '', '', now(), now(),
    '{"full_name": "Emma Collins"}'::jsonb
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    v_uk_staff_id, v_uk_staff_id, 'emma@brewandbarrel.co.uk',
    jsonb_build_object('sub', v_uk_staff_id::text, 'email', 'emma@brewandbarrel.co.uk'),
    'email', now(), now(), now()
  ) ON CONFLICT (provider_id, provider) DO NOTHING;

  -- AU Owner
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, confirmation_token, recovery_token, created_at, updated_at, raw_user_meta_data)
  VALUES (
    v_au_owner_id, '00000000-0000-0000-0000-000000000000',
    'liam@southerncross.coffee', v_password_hash,
    now(), 'authenticated', 'authenticated', '', '', now(), now(),
    '{"full_name": "Liam O''Sullivan"}'::jsonb
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    v_au_owner_id, v_au_owner_id, 'liam@southerncross.coffee',
    jsonb_build_object('sub', v_au_owner_id::text, 'email', 'liam@southerncross.coffee'),
    'email', now(), now(), now()
  ) ON CONFLICT (provider_id, provider) DO NOTHING;

  -- AU Staff
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, confirmation_token, recovery_token, created_at, updated_at, raw_user_meta_data)
  VALUES (
    v_au_staff_id, '00000000-0000-0000-0000-000000000000',
    'ruby@southerncross.coffee', v_password_hash,
    now(), 'authenticated', 'authenticated', '', '', now(), now(),
    '{"full_name": "Ruby Chen"}'::jsonb
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    v_au_staff_id, v_au_staff_id, 'ruby@southerncross.coffee',
    jsonb_build_object('sub', v_au_staff_id::text, 'email', 'ruby@southerncross.coffee'),
    'email', now(), now(), now()
  ) ON CONFLICT (provider_id, provider) DO NOTHING;

  -- TH Owner
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, confirmation_token, recovery_token, created_at, updated_at, raw_user_meta_data)
  VALUES (
    v_th_owner_id, '00000000-0000-0000-0000-000000000000',
    'somchai@chiangmaimountain.co.th', v_password_hash,
    now(), 'authenticated', 'authenticated', '', '', now(), now(),
    '{"full_name": "Somchai Prasert"}'::jsonb
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    v_th_owner_id, v_th_owner_id, 'somchai@chiangmaimountain.co.th',
    jsonb_build_object('sub', v_th_owner_id::text, 'email', 'somchai@chiangmaimountain.co.th'),
    'email', now(), now(), now()
  ) ON CONFLICT (provider_id, provider) DO NOTHING;

  -- TH Staff
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, confirmation_token, recovery_token, created_at, updated_at, raw_user_meta_data)
  VALUES (
    v_th_staff_id, '00000000-0000-0000-0000-000000000000',
    'niran@chiangmaimountain.co.th', v_password_hash,
    now(), 'authenticated', 'authenticated', '', '', now(), now(),
    '{"full_name": "Niran Kaewsai"}'::jsonb
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    v_th_staff_id, v_th_staff_id, 'niran@chiangmaimountain.co.th',
    jsonb_build_object('sub', v_th_staff_id::text, 'email', 'niran@chiangmaimountain.co.th'),
    'email', now(), now(), now()
  ) ON CONFLICT (provider_id, provider) DO NOTHING;

  -- ════════════════════════════════════════════════════════════
  -- 2. PUBLIC USERS (mirrors auth.users)
  -- ════════════════════════════════════════════════════════════

  INSERT INTO public.users (id, email, full_name) VALUES
    (v_uk_owner_id, 'james@brewandbarrel.co.uk', 'James Whitfield'),
    (v_uk_staff_id, 'emma@brewandbarrel.co.uk', 'Emma Collins'),
    (v_au_owner_id, 'liam@southerncross.coffee', 'Liam O''Sullivan'),
    (v_au_staff_id, 'ruby@southerncross.coffee', 'Ruby Chen'),
    (v_th_owner_id, 'somchai@chiangmaimountain.co.th', 'Somchai Prasert'),
    (v_th_staff_id, 'niran@chiangmaimountain.co.th', 'Niran Kaewsai')
  ON CONFLICT (id) DO NOTHING;

  -- ════════════════════════════════════════════════════════════
  -- 3. PEOPLE (identity layer)
  -- ════════════════════════════════════════════════════════════

  INSERT INTO public.people (id, email, first_name, last_name, phone) VALUES
    (v_uk_people_owner, 'james@brewandbarrel.co.uk', 'James', 'Whitfield', '+44 7700 900001'),
    (v_uk_people_staff, 'emma@brewandbarrel.co.uk', 'Emma', 'Collins', '+44 7700 900002'),
    (v_au_people_owner, 'liam@southerncross.coffee', 'Liam', 'O''Sullivan', '+61 400 000 001'),
    (v_au_people_staff, 'ruby@southerncross.coffee', 'Ruby', 'Chen', '+61 400 000 002'),
    (v_th_people_owner, 'somchai@chiangmaimountain.co.th', 'Somchai', 'Prasert', '+66 81 000 0001'),
    (v_th_people_staff, 'niran@chiangmaimountain.co.th', 'Niran', 'Kaewsai', '+66 81 000 0002')
  ON CONFLICT (id) DO NOTHING;

  -- ════════════════════════════════════════════════════════════
  -- 4. PARTNER ROASTERS (the businesses)
  -- ════════════════════════════════════════════════════════════

  INSERT INTO public.partner_roasters (
    id, email, password_hash, business_name, contact_name, phone, website,
    country, address_line1, city, postcode, roaster_slug, user_id,
    is_active, is_ghost_roaster, is_verified,
    ghost_roaster_application_status, ghost_roaster_applied_at, ghost_roaster_approved_at,
    platform_fee_percent, strikes
  ) VALUES
    -- UK: Brew & Barrel Roasters
    (
      v_uk_roaster_id, 'james@brewandbarrel.co.uk', v_password_hash,
      'Brew & Barrel Roasters', 'James Whitfield', '+44 20 7946 0958', 'https://brewandbarrel.co.uk',
      'GB', '42 Roastery Lane, Shoreditch', 'London', 'E1 6AN', 'brew-and-barrel-roasters', v_uk_owner_id,
      true, true, true,
      'approved', now() - interval '60 days', now() - interval '45 days',
      4.0, 0
    ),
    -- AU: Southern Cross Coffee Co
    (
      v_au_roaster_id, 'liam@southerncross.coffee', v_password_hash,
      'Southern Cross Coffee Co', 'Liam O''Sullivan', '+61 3 9000 1234', 'https://southerncross.coffee',
      'AU', '15 Bean Street, Collingwood', 'Melbourne', '3066', 'southern-cross-coffee-co', v_au_owner_id,
      true, true, true,
      'approved', now() - interval '30 days', now() - interval '20 days',
      5.0, 0
    ),
    -- TH: Chiang Mai Mountain Roast
    (
      v_th_roaster_id, 'somchai@chiangmaimountain.co.th', v_password_hash,
      'Chiang Mai Mountain Roast', 'Somchai Prasert', '+66 53 000 123', 'https://chiangmaimountain.co.th',
      'TH', '88 Nimman Rd, Suthep', 'Chiang Mai', '50200', 'chiang-mai-mountain-roast', v_th_owner_id,
      true, true, true,
      'approved', now() - interval '15 days', now() - interval '10 days',
      3.5, 0
    )
  ON CONFLICT (id) DO NOTHING;

  -- ════════════════════════════════════════════════════════════
  -- 5. PROFILES (link auth users to people)
  -- ════════════════════════════════════════════════════════════

  INSERT INTO public.profiles (id, people_id, role, associated_roaster_id, auth_status) VALUES
    (v_uk_owner_id, v_uk_people_owner, 'roaster_owner', v_uk_roaster_id, 'active'),
    (v_uk_staff_id, v_uk_people_staff, 'roaster_staff', v_uk_roaster_id, 'active'),
    (v_au_owner_id, v_au_people_owner, 'roaster_owner', v_au_roaster_id, 'active'),
    (v_au_staff_id, v_au_people_staff, 'roaster_staff', v_au_roaster_id, 'active'),
    (v_th_owner_id, v_th_people_owner, 'roaster_owner', v_th_roaster_id, 'active'),
    (v_th_staff_id, v_th_people_staff, 'roaster_staff', v_th_roaster_id, 'active')
  ON CONFLICT (id) DO NOTHING;

  -- ════════════════════════════════════════════════════════════
  -- 6. USER ROLES
  -- ════════════════════════════════════════════════════════════

  INSERT INTO public.user_roles (user_id, role_id, roaster_id) VALUES
    (v_uk_owner_id, 'roaster', v_uk_roaster_id),
    (v_uk_staff_id, 'roaster', v_uk_roaster_id),
    (v_au_owner_id, 'roaster', v_au_roaster_id),
    (v_au_staff_id, 'roaster', v_au_roaster_id),
    (v_th_owner_id, 'roaster', v_th_roaster_id),
    (v_th_staff_id, 'roaster', v_th_roaster_id)
  ON CONFLICT (user_id, role_id, roaster_id) DO NOTHING;

  -- ════════════════════════════════════════════════════════════
  -- 7. TEAM MEMBERS
  -- ════════════════════════════════════════════════════════════

  INSERT INTO public.team_members (roaster_id, user_id, role) VALUES
    (v_uk_roaster_id, v_uk_owner_id, 'owner'),
    (v_uk_roaster_id, v_uk_staff_id, 'staff'),
    (v_au_roaster_id, v_au_owner_id, 'owner'),
    (v_au_roaster_id, v_au_staff_id, 'staff'),
    (v_th_roaster_id, v_th_owner_id, 'owner'),
    (v_th_roaster_id, v_th_staff_id, 'staff')
  ON CONFLICT (roaster_id, user_id) DO NOTHING;

  -- ════════════════════════════════════════════════════════════
  -- 8. PARTNER TERRITORIES
  -- ════════════════════════════════════════════════════════════

  -- Only insert if no active territory exists for this country
  INSERT INTO public.partner_territories (roaster_id, country_code, country_name, is_active)
  SELECT v_uk_roaster_id, 'GB', 'United Kingdom', true
  WHERE NOT EXISTS (SELECT 1 FROM public.partner_territories WHERE country_code = 'GB' AND COALESCE(region, '') = '' AND is_active = true);

  INSERT INTO public.partner_territories (roaster_id, country_code, country_name, is_active)
  SELECT v_au_roaster_id, 'AU', 'Australia', true
  WHERE NOT EXISTS (SELECT 1 FROM public.partner_territories WHERE country_code = 'AU' AND COALESCE(region, '') = '' AND is_active = true);

  INSERT INTO public.partner_territories (roaster_id, country_code, country_name, is_active)
  SELECT v_th_roaster_id, 'TH', 'Thailand', true
  WHERE NOT EXISTS (SELECT 1 FROM public.partner_territories WHERE country_code = 'TH' AND COALESCE(region, '') = '' AND is_active = true);

  -- ════════════════════════════════════════════════════════════
  -- 9. PARTNER RATES (per bag size per partner)
  --    Rates are what we PAY the partner (lower than customer price)
  -- ════════════════════════════════════════════════════════════

  -- UK rates (GBP) — only insert if no active rate exists for this roaster+bag_size
  INSERT INTO public.partner_rates (roaster_id, bag_size, currency, tier_10_24, tier_25_49, tier_50_99, tier_100_150)
  SELECT v_uk_roaster_id, '250g', 'GBP', 2.80, 2.50, 2.20, 1.95
  WHERE NOT EXISTS (SELECT 1 FROM public.partner_rates WHERE roaster_id = v_uk_roaster_id AND bag_size = '250g' AND is_active = true);
  INSERT INTO public.partner_rates (roaster_id, bag_size, currency, tier_10_24, tier_25_49, tier_50_99, tier_100_150)
  SELECT v_uk_roaster_id, '500g', 'GBP', 3.60, 3.20, 2.85, 2.55
  WHERE NOT EXISTS (SELECT 1 FROM public.partner_rates WHERE roaster_id = v_uk_roaster_id AND bag_size = '500g' AND is_active = true);
  INSERT INTO public.partner_rates (roaster_id, bag_size, currency, tier_10_24, tier_25_49, tier_50_99, tier_100_150)
  SELECT v_uk_roaster_id, '1kg', 'GBP', 5.40, 4.80, 4.30, 3.85
  WHERE NOT EXISTS (SELECT 1 FROM public.partner_rates WHERE roaster_id = v_uk_roaster_id AND bag_size = '1kg' AND is_active = true);

  -- AU rates (AUD)
  INSERT INTO public.partner_rates (roaster_id, bag_size, currency, tier_10_24, tier_25_49, tier_50_99, tier_100_150)
  SELECT v_au_roaster_id, '250g', 'AUD', 4.50, 4.00, 3.50, 3.10
  WHERE NOT EXISTS (SELECT 1 FROM public.partner_rates WHERE roaster_id = v_au_roaster_id AND bag_size = '250g' AND is_active = true);
  INSERT INTO public.partner_rates (roaster_id, bag_size, currency, tier_10_24, tier_25_49, tier_50_99, tier_100_150)
  SELECT v_au_roaster_id, '500g', 'AUD', 5.80, 5.20, 4.60, 4.10
  WHERE NOT EXISTS (SELECT 1 FROM public.partner_rates WHERE roaster_id = v_au_roaster_id AND bag_size = '500g' AND is_active = true);
  INSERT INTO public.partner_rates (roaster_id, bag_size, currency, tier_10_24, tier_25_49, tier_50_99, tier_100_150)
  SELECT v_au_roaster_id, '1kg', 'AUD', 8.50, 7.60, 6.80, 6.10
  WHERE NOT EXISTS (SELECT 1 FROM public.partner_rates WHERE roaster_id = v_au_roaster_id AND bag_size = '1kg' AND is_active = true);

  -- TH rates (THB)
  INSERT INTO public.partner_rates (roaster_id, bag_size, currency, tier_10_24, tier_25_49, tier_50_99, tier_100_150)
  SELECT v_th_roaster_id, '250g', 'THB', 85.00, 75.00, 65.00, 58.00
  WHERE NOT EXISTS (SELECT 1 FROM public.partner_rates WHERE roaster_id = v_th_roaster_id AND bag_size = '250g' AND is_active = true);
  INSERT INTO public.partner_rates (roaster_id, bag_size, currency, tier_10_24, tier_25_49, tier_50_99, tier_100_150)
  SELECT v_th_roaster_id, '500g', 'THB', 120.00, 105.00, 95.00, 85.00
  WHERE NOT EXISTS (SELECT 1 FROM public.partner_rates WHERE roaster_id = v_th_roaster_id AND bag_size = '500g' AND is_active = true);
  INSERT INTO public.partner_rates (roaster_id, bag_size, currency, tier_10_24, tier_25_49, tier_50_99, tier_100_150)
  SELECT v_th_roaster_id, '1kg', 'THB', 180.00, 160.00, 140.00, 125.00
  WHERE NOT EXISTS (SELECT 1 FROM public.partner_rates WHERE roaster_id = v_th_roaster_id AND bag_size = '1kg' AND is_active = true);

  -- ════════════════════════════════════════════════════════════
  -- 10. PARTNER APPLICATIONS (all approved)
  -- ════════════════════════════════════════════════════════════

  INSERT INTO public.partner_applications (roaster_id, status, applied_at, reviewed_at, proposed_countries, application_notes)
  SELECT v_uk_roaster_id, 'approved', now() - interval '60 days', now() - interval '45 days',
    ARRAY['GB'], 'Established London roastery with 8 years experience. Specialise in single-origin and seasonal blends.'
  WHERE NOT EXISTS (SELECT 1 FROM public.partner_applications WHERE roaster_id = v_uk_roaster_id);

  INSERT INTO public.partner_applications (roaster_id, status, applied_at, reviewed_at, proposed_countries, application_notes)
  SELECT v_au_roaster_id, 'approved', now() - interval '30 days', now() - interval '20 days',
    ARRAY['AU', 'NZ'], 'Melbourne-based specialty roaster. Can cover Australia and New Zealand. Own delivery fleet in Melbourne metro.'
  WHERE NOT EXISTS (SELECT 1 FROM public.partner_applications WHERE roaster_id = v_au_roaster_id);

  INSERT INTO public.partner_applications (roaster_id, status, applied_at, reviewed_at, proposed_countries, application_notes)
  SELECT v_th_roaster_id, 'approved', now() - interval '15 days', now() - interval '10 days',
    ARRAY['TH', 'SG', 'MY'], 'Chiang Mai hill-tribe coffee specialist. Direct relationships with local farmers. Can fulfil across Southeast Asia.'
  WHERE NOT EXISTS (SELECT 1 FROM public.partner_applications WHERE roaster_id = v_th_roaster_id);

  RAISE NOTICE 'Seeded 3 test partners: UK (Brew & Barrel), AU (Southern Cross), TH (Chiang Mai Mountain)';

END;
$$;

COMMIT;
