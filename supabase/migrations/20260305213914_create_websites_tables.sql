-- ============================================================================
-- Website Builder: websites + website_pages tables
-- Drop stale tables from previous attempts, then recreate cleanly.
-- ============================================================================

-- Drop old tables if they exist (from incomplete previous migration)
drop table if exists website_pages cascade;
drop table if exists websites cascade;

-- websites: one per roaster
create table websites (
  id uuid primary key default gen_random_uuid(),
  roaster_id uuid not null references partner_roasters(id) on delete cascade,
  name text not null default '',
  subdomain text unique,
  domain text unique,
  is_published boolean not null default false,
  template_id text,
  design_settings jsonb not null default '{}'::jsonb,
  footer_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint websites_roaster_unique unique (roaster_id)
);

-- website_pages: ordered pages within a website
create table website_pages (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references websites(id) on delete cascade,
  title text not null default 'Untitled',
  slug text not null default 'home',
  content jsonb not null default '[]'::jsonb,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  meta_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint website_pages_unique_slug unique (website_id, slug)
);

-- Indexes
create index idx_websites_roaster_id on websites(roaster_id);
create index idx_websites_subdomain on websites(subdomain);
create index idx_websites_domain on websites(domain);
create index idx_website_pages_website_id on website_pages(website_id);
create index idx_website_pages_slug on website_pages(website_id, slug);

-- Updated_at trigger function (reuse if exists)
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Drop triggers if they exist from previous attempt
drop trigger if exists set_websites_updated_at on websites;
drop trigger if exists set_website_pages_updated_at on website_pages;

create trigger set_websites_updated_at
  before update on websites
  for each row
  execute function update_updated_at_column();

create trigger set_website_pages_updated_at
  before update on website_pages
  for each row
  execute function update_updated_at_column();

-- RLS policies
alter table websites enable row level security;
alter table website_pages enable row level security;

-- Public read: anyone can view published websites
create policy "Published websites are public"
  on websites for select
  using (is_published = true);

-- Roaster can manage their own website
create policy "Roasters can manage own website"
  on websites for all
  using (
    roaster_id in (
      select id from partner_roasters where user_id = auth.uid()
    )
  );

-- Public read: anyone can view pages of published websites
create policy "Published pages are public"
  on website_pages for select
  using (
    website_id in (
      select id from websites where is_published = true
    )
  );

-- Roaster can manage pages of their own website
create policy "Roasters can manage own pages"
  on website_pages for all
  using (
    website_id in (
      select w.id from websites w
      join partner_roasters pr on pr.id = w.roaster_id
      where pr.user_id = auth.uid()
    )
  );

-- Service role bypass (for API routes using service key)
create policy "Service role full access websites"
  on websites for all
  using (auth.role() = 'service_role');

create policy "Service role full access pages"
  on website_pages for all
  using (auth.role() = 'service_role');

-- Add website_enabled column to partner_roasters if not present
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'partner_roasters' and column_name = 'website_enabled'
  ) then
    alter table partner_roasters add column website_enabled boolean not null default false;
  end if;
end $$;
