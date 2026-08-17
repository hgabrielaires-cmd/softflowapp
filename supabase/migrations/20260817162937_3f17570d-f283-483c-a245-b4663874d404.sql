create table if not exists public.sicredi_tokens (
  ambiente text primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  refresh_expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

grant all on public.sicredi_tokens to service_role;

alter table public.sicredi_tokens enable row level security;