-- Account setup tokens for wholesale customers (and other non-roaster users)
-- who are created via admin/API flows and need to set a password.
create table if not exists account_setup_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_account_setup_tokens_token on account_setup_tokens(token);
create index idx_account_setup_tokens_user_id on account_setup_tokens(user_id);
