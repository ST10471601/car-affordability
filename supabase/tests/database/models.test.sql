begin;
select plan(23);

insert into public.brands (slug, name)
values ('toyota', 'Toyota'), ('suzuki', 'Suzuki');

create function pg_temp.insert_model(
  slug text,
  body_type text default 'suv',
  brand_slug text default 'toyota'
)
returns void
language sql
as $$
  insert into public.models (brand_id, slug, name, body_type)
  select brands.id, insert_model.slug, 'Model', insert_model.body_type
  from public.brands
  where brands.slug = insert_model.brand_slug;
$$;

select lives_ok(
  format('select pg_temp.insert_model(%L)', slug),
  format('accepts slug %L', slug)
)
from unnest(array['corolla-cross', 'gr86']) as slug;

select throws_ok(
  format('select pg_temp.insert_model(%L)', slug),
  '23514',
  'new row for relation "models" violates check constraint "models_slug_check"',
  format('rejects slug %L', slug)
)
from unnest(
  array['Hilux', 'corolla--cross', '-hilux', 'hilux-', 'corolla cross', 'corolla_cross', '']
) as slug;

select lives_ok(
  format('select pg_temp.insert_model(%L, body_type => %L)', body_type || '-model', body_type),
  format('accepts body type %L', body_type)
)
from unnest(
  array['hatchback', 'sedan', 'suv', 'bakkie', 'mpv', 'coupe', 'convertible', 'wagon', 'van']
) as body_type;

select throws_ok(
  format('select pg_temp.insert_model(%L, body_type => %L)', 'bad-body-type', body_type),
  '23514',
  'new row for relation "models" violates check constraint "models_body_type_check"',
  format('rejects body type %L', body_type)
)
from unnest(array['crossover', 'SUV']) as body_type;

select throws_ok(
  $$select pg_temp.insert_model('corolla-cross')$$,
  '23505',
  'duplicate key value violates unique constraint "models_brand_id_slug_key"',
  'rejects a duplicate slug within a brand'
);

select lives_ok(
  $$select pg_temp.insert_model('corolla-cross', brand_slug => 'suzuki')$$,
  'accepts the same slug under another brand'
);

insert into public.models (brand_id, slug, name, body_type, updated_at)
select id, 'hilux', 'Hilux', 'bakkie', '2026-01-01 00:00:00+00'
from public.brands
where slug = 'toyota';

update public.models set name = 'Hilux Double Cab' where slug = 'hilux';

select is(
  (select updated_at from public.models where slug = 'hilux'),
  now(),
  'sets updated_at when a model is updated'
);

select * from finish();
rollback;
