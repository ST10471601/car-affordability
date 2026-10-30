begin;
select plan(40);

insert into public.brands (slug, name) values ('toyota', 'Toyota');

insert into public.models (brand_id, slug, name, body_type)
select id, model.slug, model.name, model.body_type
from public.brands
cross join (
  values
    ('corolla-cross', 'Corolla Cross', 'suv'),
    ('hilux', 'Hilux', 'bakkie')
) as model (slug, name, body_type)
where brands.slug = 'toyota';

create function pg_temp.insert_variant(
  slug text,
  model_slug text default 'corolla-cross',
  transmission text default 'automatic',
  powertrain text default 'petrol',
  claimed_consumption numeric default 6.5,
  fuel_tank_litres numeric default null,
  battery_kwh numeric default null,
  year_from integer default 2022,
  year_to integer default null,
  service_plan_months integer default null,
  service_plan_km integer default null,
  list_price_cents bigint default null,
  price_observed_at timestamptz default null
)
returns void
language sql
as $$
  insert into public.variants (
    model_id,
    slug,
    name,
    transmission,
    powertrain,
    claimed_consumption,
    fuel_tank_litres,
    battery_kwh,
    year_from,
    year_to,
    service_plan_months,
    service_plan_km,
    list_price_cents,
    price_observed_at
  )
  select
    models.id,
    insert_variant.slug,
    'Variant',
    insert_variant.transmission,
    insert_variant.powertrain,
    insert_variant.claimed_consumption,
    insert_variant.fuel_tank_litres,
    insert_variant.battery_kwh,
    insert_variant.year_from,
    insert_variant.year_to,
    insert_variant.service_plan_months,
    insert_variant.service_plan_km,
    insert_variant.list_price_cents,
    insert_variant.price_observed_at
  from public.models
  where models.slug = insert_variant.model_slug;
$$;

select lives_ok(
  format('select pg_temp.insert_variant(%L)', slug),
  format('accepts slug %L', slug)
)
from unnest(array['1-8-xs-hybrid', 'gr-sport']) as slug;

select throws_ok(
  format('select pg_temp.insert_variant(%L)', slug),
  '23514',
  'new row for relation "variants" violates check constraint "variants_slug_check"',
  format('rejects slug %L', slug)
)
from unnest(
  array['GR-Sport', 'gr--sport', '-xs', 'xs-', '1.8 xs', '1_8_xs', '']
) as slug;

select throws_ok(
  $$select pg_temp.insert_variant('gr-sport')$$,
  '23505',
  'duplicate key value violates unique constraint "variants_model_id_slug_key"',
  'rejects a duplicate slug within a model'
);

select lives_ok(
  $$select pg_temp.insert_variant('gr-sport', model_slug => 'hilux')$$,
  'accepts the same slug under another model'
);

select lives_ok(
  format('select pg_temp.insert_variant(%L, transmission => %L)', transmission, transmission),
  format('accepts transmission %L', transmission)
)
from unnest(array['manual', 'automatic']) as transmission;

select throws_ok(
  format('select pg_temp.insert_variant(%L, transmission => %L)', 'bad-transmission', transmission),
  '23514',
  'new row for relation "variants" violates check constraint "variants_transmission_check"',
  format('rejects transmission %L', transmission)
)
from unnest(array['cvt', 'Manual']) as transmission;

select lives_ok(
  format('select pg_temp.insert_variant(%L, powertrain => %L)', lower(powertrain), powertrain),
  format('accepts powertrain %L', powertrain)
)
from unnest(
  array['petrol', 'diesel', 'hybrid', 'plugInHybrid', 'electric']
) as powertrain;

select throws_ok(
  format('select pg_temp.insert_variant(%L, powertrain => %L)', 'bad-powertrain', powertrain),
  '23514',
  'new row for relation "variants" violates check constraint "variants_powertrain_check"',
  format('rejects powertrain %L', powertrain)
)
from unnest(array['plug_in_hybrid', 'Petrol']) as powertrain;

select lives_ok(
  $$select pg_temp.insert_variant('frugal', claimed_consumption => 0.1)$$,
  'accepts a positive claimed consumption'
);

select throws_ok(
  $$select pg_temp.insert_variant('no-consumption', claimed_consumption => 0)$$,
  '23514',
  'new row for relation "variants" violates check constraint "variants_claimed_consumption_check"',
  'rejects a claimed consumption of zero'
);

select lives_ok(
  $$select pg_temp.insert_variant('with-tank', fuel_tank_litres => 47.0)$$,
  'accepts a positive fuel tank size'
);

select throws_ok(
  $$select pg_temp.insert_variant('empty-tank', fuel_tank_litres => 0)$$,
  '23514',
  'new row for relation "variants" violates check constraint "variants_fuel_tank_litres_check"',
  'rejects a fuel tank size of zero'
);

select lives_ok(
  $$select pg_temp.insert_variant('with-battery', powertrain => 'plugInHybrid', battery_kwh => 13.6)$$,
  'accepts a positive battery size'
);

select throws_ok(
  $$select pg_temp.insert_variant('empty-battery', powertrain => 'plugInHybrid', battery_kwh => 0)$$,
  '23514',
  'new row for relation "variants" violates check constraint "variants_battery_kwh_check"',
  'rejects a battery size of zero'
);

select lives_ok(
  $$select pg_temp.insert_variant('single-year', year_from => 2022, year_to => 2022)$$,
  'accepts a production run that ends in the year it starts'
);

select throws_ok(
  $$select pg_temp.insert_variant('reversed-years', year_from => 2023, year_to => 2022)$$,
  '23514',
  'new row for relation "variants" violates check constraint "variants_year_range_check"',
  'rejects a production run that ends before it starts'
);

select lives_ok(
  $$select pg_temp.insert_variant('service-plan', service_plan_months => 72, service_plan_km => 90000)$$,
  'accepts a service plan with both months and kilometres'
);

select throws_ok(
  $$select pg_temp.insert_variant('plan-months-only', service_plan_months => 72)$$,
  '23514',
  'new row for relation "variants" violates check constraint "variants_service_plan_pair_check"',
  'rejects a service plan with months but no kilometres'
);

select throws_ok(
  $$select pg_temp.insert_variant('plan-km-only', service_plan_km => 90000)$$,
  '23514',
  'new row for relation "variants" violates check constraint "variants_service_plan_pair_check"',
  'rejects a service plan with kilometres but no months'
);

select lives_ok(
  $$
    select pg_temp.insert_variant(
      'priced',
      list_price_cents => 45990000,
      price_observed_at => '2026-10-30 09:00:00+02'
    )
  $$,
  'accepts a list price with the time it was observed'
);

select throws_ok(
  $$select pg_temp.insert_variant('price-only', list_price_cents => 45990000)$$,
  '23514',
  'new row for relation "variants" violates check constraint "variants_list_price_pair_check"',
  'rejects a list price without the time it was observed'
);

select throws_ok(
  $$select pg_temp.insert_variant('observed-only', price_observed_at => '2026-10-30 09:00:00+02')$$,
  '23514',
  'new row for relation "variants" violates check constraint "variants_list_price_pair_check"',
  'rejects an observation time without a list price'
);

select throws_ok(
  $$
    select pg_temp.insert_variant(
      'free',
      list_price_cents => 0,
      price_observed_at => '2026-10-30 09:00:00+02'
    )
  $$,
  '23514',
  'new row for relation "variants" violates check constraint "variants_list_price_cents_check"',
  'rejects a list price of zero'
);

select lives_ok(
  $$select pg_temp.insert_variant('ev', powertrain => 'electric', claimed_consumption => 15.2, battery_kwh => 64.0)$$,
  'accepts an electric variant without a fuel tank'
);

select throws_ok(
  $$select pg_temp.insert_variant('ev-with-tank', powertrain => 'electric', fuel_tank_litres => 40.0)$$,
  '23514',
  'new row for relation "variants" violates check constraint "variants_electric_no_fuel_tank_check"',
  'rejects an electric variant with a fuel tank'
);

insert into public.variants (
  model_id,
  slug,
  name,
  transmission,
  powertrain,
  claimed_consumption,
  year_from,
  updated_at
)
select id, '1-8-xs', '1.8 Xs', 'automatic', 'petrol', 7.2, 2022, '2026-01-01 00:00:00+00'
from public.models
where slug = 'corolla-cross';

update public.variants set name = '1.8 Xs CVT' where slug = '1-8-xs';

select is(
  (select updated_at from public.variants where slug = '1-8-xs'),
  now(),
  'sets updated_at when a variant is updated'
);

select * from finish();
rollback;
