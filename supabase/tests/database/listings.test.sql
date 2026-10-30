begin;
select plan(26);

insert into public.brands (slug, name) values ('toyota', 'Toyota');

insert into public.models (brand_id, slug, name, body_type)
select id, 'corolla-cross', 'Corolla Cross', 'suv'
from public.brands
where slug = 'toyota';

insert into public.variants (
  model_id,
  slug,
  name,
  transmission,
  powertrain,
  claimed_consumption,
  year_from
)
select id, '1-8-xs-hybrid', '1.8 Xs Hybrid', 'automatic', 'hybrid', 4.3, 2022
from public.models
where slug = 'corolla-cross';

create function pg_temp.insert_listing(
  external_id text,
  source text default 'autotrader',
  mileage_km integer default 45000,
  price_cents bigint default 38990000,
  province text default 'gauteng',
  listing_url text default 'https://www.autotrader.co.za/car-for-sale/toyota/corolla-cross',
  first_seen_at timestamptz default '2026-10-01 08:00:00+02',
  last_seen_at timestamptz default '2026-10-30 08:00:00+02'
)
returns void
language sql
as $$
  insert into public.listings (
    source,
    external_id,
    model_id,
    variant_id,
    model_year,
    mileage_km,
    price_cents,
    province,
    listing_url,
    first_seen_at,
    last_seen_at
  )
  select
    insert_listing.source,
    insert_listing.external_id,
    variants.model_id,
    variants.id,
    2023,
    insert_listing.mileage_km,
    insert_listing.price_cents,
    insert_listing.province,
    insert_listing.listing_url,
    insert_listing.first_seen_at,
    insert_listing.last_seen_at
  from public.variants
  where variants.slug = '1-8-xs-hybrid';
$$;

select lives_ok(
  $$select pg_temp.insert_listing('1001')$$,
  'accepts an AutoTrader listing with an https URL'
);

select throws_ok(
  format('select pg_temp.insert_listing(%L, source => %L)', 'bad-source', source),
  '23514',
  'new row for relation "listings" violates check constraint "listings_source_check"',
  format('rejects source %L', source)
)
from unnest(array['webuycars', 'AutoTrader']) as source;

select throws_ok(
  $$select pg_temp.insert_listing('1001')$$,
  '23505',
  'duplicate key value violates unique constraint "listings_source_external_id_key"',
  'rejects a duplicate external id from the same source'
);

select lives_ok(
  $$select pg_temp.insert_listing('1002')$$,
  'accepts another external id from the same source'
);

select lives_ok(
  format('select pg_temp.insert_listing(%L, province => %L)', 'province-' || province, province),
  format('accepts province %L', province)
)
from unnest(
  array[
    'gauteng',
    'westernCape',
    'kwazuluNatal',
    'easternCape',
    'freeState',
    'limpopo',
    'mpumalanga',
    'northWest',
    'northernCape'
  ]
) as province;

select throws_ok(
  format('select pg_temp.insert_listing(%L, province => %L)', 'bad-province', province),
  '23514',
  'new row for relation "listings" violates check constraint "listings_province_check"',
  format('rejects province %L', province)
)
from unnest(array['western_cape', 'Gauteng', 'kwaZuluNatal']) as province;

select lives_ok(
  $$select pg_temp.insert_listing('new-car', mileage_km => 0)$$,
  'accepts zero mileage'
);

select throws_ok(
  $$select pg_temp.insert_listing('negative-mileage', mileage_km => -1)$$,
  '23514',
  'new row for relation "listings" violates check constraint "listings_mileage_km_check"',
  'rejects negative mileage'
);

select lives_ok(
  $$select pg_temp.insert_listing('one-cent', price_cents => 1)$$,
  'accepts a positive price'
);

select throws_ok(
  $$select pg_temp.insert_listing('free', price_cents => 0)$$,
  '23514',
  'new row for relation "listings" violates check constraint "listings_price_cents_check"',
  'rejects a price of zero'
);

select throws_ok(
  format('select pg_temp.insert_listing(%L, listing_url => %L)', 'bad-url', listing_url),
  '23514',
  'new row for relation "listings" violates check constraint "listings_listing_url_check"',
  format('rejects listing URL %L', listing_url)
)
from unnest(
  array[
    'http://www.autotrader.co.za/car-for-sale/toyota/corolla-cross',
    'www.autotrader.co.za/car-for-sale/toyota/corolla-cross'
  ]
) as listing_url;

select lives_ok(
  $$
    select pg_temp.insert_listing(
      'seen-once',
      first_seen_at => '2026-10-30 08:00:00+02',
      last_seen_at => '2026-10-30 08:00:00+02'
    )
  $$,
  'accepts a listing last seen when it was first seen'
);

select throws_ok(
  $$
    select pg_temp.insert_listing(
      'seen-backwards',
      first_seen_at => '2026-10-30 08:00:00+02',
      last_seen_at => '2026-10-29 08:00:00+02'
    )
  $$,
  '23514',
  'new row for relation "listings" violates check constraint "listings_seen_range_check"',
  'rejects a listing last seen before it was first seen'
);

insert into public.listings (
  source,
  external_id,
  model_id,
  model_year,
  mileage_km,
  price_cents,
  province,
  listing_url,
  first_seen_at,
  last_seen_at,
  updated_at
)
select
  'autotrader',
  '2001',
  id,
  2023,
  30000,
  41990000,
  'westernCape',
  'https://www.autotrader.co.za/car-for-sale/toyota/corolla-cross',
  '2026-01-01 00:00:00+00',
  '2026-01-01 00:00:00+00',
  '2026-01-01 00:00:00+00'
from public.models
where slug = 'corolla-cross';

update public.listings set last_seen_at = now() where external_id = '2001';

select is(
  (select updated_at from public.listings where external_id = '2001'),
  now(),
  'sets updated_at when a listing is updated'
);

select * from finish();
rollback;
