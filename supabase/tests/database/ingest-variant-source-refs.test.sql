begin;
select plan(12);

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
select id, variant.slug, variant.name, 'automatic', variant.powertrain, variant.claimed_consumption, 2022
from public.models
cross join (
  values
    ('1-8-xs-hybrid', '1.8 Xs Hybrid', 'hybrid', 4.3),
    ('gr-sport', 'GR-Sport', 'petrol', 7.2)
) as variant (slug, name, powertrain, claimed_consumption)
where models.slug = 'corolla-cross';

create function pg_temp.insert_ref(
  source text,
  external_ref text,
  variant_slug text default '1-8-xs-hybrid'
)
returns void
language sql
as $$
  insert into ingest.variant_source_refs (source, external_ref, variant_id)
  select insert_ref.source, insert_ref.external_ref, variants.id
  from public.variants
  where variants.slug = insert_ref.variant_slug;
$$;

select lives_ok(
  format('select pg_temp.insert_ref(%L, %L)', source, 'corolla-cross-1-8-xs-hybrid'),
  format('accepts source %L', source)
)
from unnest(array['autotrader', 'cars-co-za']) as source;

select throws_ok(
  format('select pg_temp.insert_ref(%L, %L)', source, 'corolla-cross-1-8-xs-hybrid'),
  '23514',
  'new row for relation "variant_source_refs" violates check constraint "variant_source_refs_source_check"',
  format('rejects source %L', source)
)
from unnest(
  array['AutoTrader', 'cars--co-za', '-autotrader', 'autotrader-', 'auto trader', 'auto_trader', '']
) as source;

select throws_ok(
  $$select pg_temp.insert_ref('autotrader', 'corolla-cross-1-8-xs-hybrid')$$,
  '23505',
  'duplicate key value violates unique constraint "variant_source_refs_pkey"',
  'rejects a duplicate external ref from the same source'
);

select lives_ok(
  $$select pg_temp.insert_ref('autotrader', 'corolla-cross-gr-sport', variant_slug => 'gr-sport')$$,
  'accepts another external ref from the same source'
);

delete from public.variants where slug = 'gr-sport';

select is_empty(
  $$select external_ref from ingest.variant_source_refs where external_ref = 'corolla-cross-gr-sport'$$,
  'removes the refs of a deleted variant'
);

select * from finish();
rollback;
