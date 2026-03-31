-- Plain-text email templates for direct contact emails
create table if not exists public.contact_email_templates (
  id uuid primary key default gen_random_uuid(),
  roaster_id uuid not null references public.partner_roasters(id) on delete cascade,
  name text not null,
  subject text not null default '',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for listing templates per roaster
create index if not exists idx_contact_email_templates_roaster
  on public.contact_email_templates(roaster_id);

-- Updated_at trigger (matching email_connections pattern)
create trigger set_contact_email_templates_updated_at
  before update on public.contact_email_templates
  for each row
  execute function update_updated_at_column();

-- RLS (matching direct_messages / inbox_messages pattern)
alter table public.contact_email_templates enable row level security;

create policy "Roasters can manage own contact email templates"
  on public.contact_email_templates
  for all
  using (
    roaster_id in (
      select pr.id
      from public.partner_roasters pr
      join public.user_roles ur on ur.user_id = auth.uid()
      where pr.id = contact_email_templates.roaster_id
        and ur.role_id = 'roaster'
    )
  );
