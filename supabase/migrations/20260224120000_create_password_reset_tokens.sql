-- Password reset tokens for partner portal
create table if not exists password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  roaster_id uuid not null references partner_roasters(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_password_reset_tokens_token on password_reset_tokens(token);
create index idx_password_reset_tokens_roaster_id on password_reset_tokens(roaster_id);
