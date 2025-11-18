-- Create table to store external account integrations (Google, etc.)
-- NOTE: Refresh tokens are sensitive. In production store encrypted or in a secrets manager.

create table if not exists external_account_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null,
  provider_account_id text,
  access_token text,
  refresh_token text,
  scope text,
  expires_at timestamptz,
  meta jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_external_account_user_provider on external_account_integrations (user_id, provider);
