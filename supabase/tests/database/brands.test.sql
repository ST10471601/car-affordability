begin;
select plan(11);

select lives_ok(
  format($$insert into public.brands (slug, name) values (%L, 'Brand')$$, slug),
  format('accepts slug %L', slug)
)
from unnest(array['toyota', 'mercedes-benz']) as slug;

select throws_ok(
  format($$insert into public.brands (slug, name) values (%L, 'Brand')$$, slug),
  '23514',
  'new row for relation "brands" violates check constraint "brands_slug_check"',
  format('rejects slug %L', slug)
)
from unnest(
  array['Toyota', 'land--rover', '-toyota', 'toyota-', 'land rover', 'land_rover', '']
) as slug;

select throws_ok(
  $$insert into public.brands (slug, name) values ('toyota', 'Toyota')$$,
  '23505',
  'duplicate key value violates unique constraint "brands_slug_key"',
  'rejects a duplicate slug'
);

insert into public.brands (slug, name, updated_at)
values ('mazda', 'Mazda', '2026-01-01 00:00:00+00');

update public.brands set name = 'Mazda Motor' where slug = 'mazda';

select is(
  (select updated_at from public.brands where slug = 'mazda'),
  now(),
  'sets updated_at when a brand is updated'
);

select * from finish();
rollback;
