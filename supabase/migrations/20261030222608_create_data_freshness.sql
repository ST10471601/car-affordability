create table public.data_freshness (
  job text primary key check (job in ('catalogue', 'listings', 'rates')),
  last_success_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create trigger data_freshness_set_updated_at
before update on public.data_freshness
for each row execute function public.set_updated_at();

alter table public.data_freshness enable row level security;
