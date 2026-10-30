begin;
select plan(27);

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
  'autotrader',
  '1001',
  model_id,
  id,
  2023,
  45000,
  38990000,
  'gauteng',
  'https://www.autotrader.co.za/car-for-sale/toyota/corolla-cross',
  '2026-10-01 08:00:00+02',
  '2026-10-30 08:00:00+02'
from public.variants
where slug = '1-8-xs-hybrid';

insert into public.config_versions (key, value, effective_from)
values ('finance_rules', '{"maxTermMonths": 72}', current_date - 1);

insert into public.data_freshness (job, last_success_at)
values ('listings', '2026-10-30 06:00:00+02');

select set_eq(
  $$
    select relations.relname::text, privileges.privilege
    from pg_catalog.pg_class as relations
    cross join unnest(
      array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN']
    ) as privileges (privilege)
    where relations.relnamespace = 'public'::regnamespace
      and relations.relkind in ('r', 'p', 'v', 'm', 'f')
      and has_table_privilege('anon', relations.oid, privileges.privilege)
  $$,
  $$
    values
      ('brands', 'SELECT'),
      ('models', 'SELECT'),
      ('variants', 'SELECT'),
      ('listings', 'SELECT'),
      ('config_versions', 'SELECT'),
      ('current_config', 'SELECT'),
      ('data_freshness', 'SELECT')
  $$,
  'grants anon select on the published tables and view and nothing else'
);

select is_empty(
  $$
    select sequences.relname, privileges.privilege
    from pg_catalog.pg_class as sequences
    cross join unnest(array['USAGE', 'SELECT', 'UPDATE']) as privileges (privilege)
    where sequences.relnamespace = 'public'::regnamespace
      and sequences.relkind = 'S'
      and has_sequence_privilege('anon', sequences.oid, privileges.privilege)
  $$,
  'grants anon nothing on sequences in public'
);

set local role anon;

select isnt_empty(
  format('select * from public.%I', relation),
  format('anon can select from %s', relation)
)
from unnest(
  array[
    'brands',
    'models',
    'variants',
    'listings',
    'config_versions',
    'current_config',
    'data_freshness'
  ]
) as relation;

select throws_ok(
  format('insert into public.%I default values', tablename),
  '42501',
  format('permission denied for table %s', tablename),
  format('anon cannot insert into %s', tablename)
)
from pg_catalog.pg_tables
where schemaname = 'public'
order by tablename;

select throws_ok(
  format('update public.%I set %I = default', tables.relname, first_column.attname),
  '42501',
  format('permission denied for table %s', tables.relname),
  format('anon cannot update %s', tables.relname)
)
from pg_catalog.pg_class as tables
join pg_catalog.pg_attribute as first_column
  on first_column.attrelid = tables.oid
  and first_column.attnum = 1
where tables.relnamespace = 'public'::regnamespace
  and tables.relkind in ('r', 'p')
order by tables.relname;

select throws_ok(
  format('delete from public.%I', tablename),
  '42501',
  format('permission denied for table %s', tablename),
  format('anon cannot delete from %s', tablename)
)
from pg_catalog.pg_tables
where schemaname = 'public'
order by tablename;

select * from finish();
rollback;
