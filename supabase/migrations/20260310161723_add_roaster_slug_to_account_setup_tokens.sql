alter table account_setup_tokens
  add column if not exists roaster_slug text;
