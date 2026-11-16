create table if not exists public.garage_state (
  id integer primary key default 1 check (id = 1),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.garage_state enable row level security;

revoke all on table public.garage_state from anon, authenticated;
