create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.brands (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.models (
  id bigint generated always as identity primary key,
  brand_id bigint not null references public.brands (id) on delete restrict,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  body_type text not null check (
    body_type in (
      'hatchback',
      'sedan',
      'suv',
      'bakkie',
      'mpv',
      'coupe',
      'convertible',
      'wagon',
      'van'
    )
  ),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, slug)
);

create table public.variants (
  id bigint generated always as identity primary key,
  model_id bigint not null references public.models (id) on delete restrict,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  trim text,
  engine_description text,
  transmission text not null check (transmission in ('manual', 'automatic')),
  powertrain text not null check (
    powertrain in ('petrol', 'diesel', 'hybrid', 'plugInHybrid', 'electric')
  ),
  claimed_consumption numeric(4, 1) not null check (claimed_consumption > 0),
  fuel_tank_litres numeric(4, 1) check (fuel_tank_litres > 0),
  battery_kwh numeric(5, 1) check (battery_kwh > 0),
  year_from smallint not null,
  year_to smallint,
  service_plan_months smallint,
  service_plan_km integer,
  list_price_cents bigint check (list_price_cents > 0),
  price_observed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (model_id, slug),
  constraint variants_year_range_check check (year_to >= year_from),
  constraint variants_service_plan_pair_check check (
    (service_plan_months is null) = (service_plan_km is null)
  ),
  constraint variants_list_price_pair_check check (
    (list_price_cents is null) = (price_observed_at is null)
  ),
  constraint variants_electric_no_fuel_tank_check check (
    powertrain <> 'electric' or fuel_tank_litres is null
  )
);

create trigger brands_set_updated_at
before update on public.brands
for each row execute function public.set_updated_at();

create trigger models_set_updated_at
before update on public.models
for each row execute function public.set_updated_at();

create trigger variants_set_updated_at
before update on public.variants
for each row execute function public.set_updated_at();

alter table public.brands enable row level security;
alter table public.models enable row level security;
alter table public.variants enable row level security;
