begin;
select plan(1);

select is_empty(
  $$
    select tables.relname
    from pg_catalog.pg_class as tables
    join pg_catalog.pg_namespace as schemas on schemas.oid = tables.relnamespace
    where schemas.nspname = 'public'
      and tables.relkind in ('r', 'p')
      and not tables.relrowsecurity
  $$,
  'enables row level security on every table in public'
);

select * from finish();
rollback;
