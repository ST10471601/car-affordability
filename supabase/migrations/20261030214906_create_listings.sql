create table public.listings (
  id bigint generated always as identity primary key,
  source text not null check (source in ('autotrader')),
  external_id text not null,
  model_id bigint not null references public.models (id) on delete restrict,
  variant_id bigint references public.variants (id) on delete restrict,
  model_year smallint not null,
  mileage_km integer not null check (mileage_km >= 0),
  price_cents bigint not null check (price_cents > 0),
  province text not null check (
    province in (
      'gauteng',
      'westernCape',
      'kwazuluNatal',
      'easternCape',
      'freeState',
      'limpopo',
      'mpumalanga',
      'northWest',
      'northernCape'
    )
  ),
  listing_url text not null check (starts_with(listing_url, 'https://')),
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id),
  constraint listings_seen_range_check check (last_seen_at >= first_seen_at)
);

create index listings_variant_id_model_year_idx
on public.listings (variant_id, model_year);

create index listings_model_id_model_year_idx
on public.listings (model_id, model_year);

create index listings_last_seen_at_idx on public.listings (last_seen_at);

create trigger listings_set_updated_at
before update on public.listings
for each row execute function public.set_updated_at();

alter table public.listings enable row level security;
