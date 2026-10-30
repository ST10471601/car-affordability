create function public.reject_append_only_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '%.% is append-only', tg_table_schema, tg_table_name;
end;
$$;

create table public.config_versions (
  id bigint generated always as identity primary key,
  key text not null check (
    key in (
      'running_cost_rates',
      'verdict_thresholds',
      'finance_rules',
      'finance_defaults',
      'affordability_limits',
      'usage_defaults'
    )
  ),
  value jsonb not null check (jsonb_typeof(value) = 'object'),
  effective_from date not null,
  created_at timestamptz not null default now(),
  unique (key, effective_from)
);

create trigger config_versions_append_only
before update or delete or truncate on public.config_versions
for each statement execute function public.reject_append_only_change();

create view public.current_config
with (security_invoker = true)
as
select distinct on (key) id, key, value, effective_from, created_at
from public.config_versions
where effective_from <= current_date
order by key, effective_from desc;

alter table public.config_versions enable row level security;
