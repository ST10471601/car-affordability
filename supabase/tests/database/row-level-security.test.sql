begin;
select plan(3);

select is_empty(
  $$
    select schemas.nspname, tables.relname
    from pg_catalog.pg_class as tables
    join pg_catalog.pg_namespace as schemas on schemas.oid = tables.relnamespace
    where schemas.nspname in ('public', 'ingest')
      and tables.relkind in ('r', 'p')
      and not tables.relrowsecurity
  $$,
  'enables row level security on every table in public and ingest'
);

select is_empty(
  $$
    select tables.tablename
    from pg_catalog.pg_tables as tables
    left join pg_catalog.pg_policies as policies
      on policies.schemaname = tables.schemaname
      and policies.tablename = tables.tablename
    where tables.schemaname = 'public'
    group by tables.tablename
    having count(policies.policyname) <> 1
  $$,
  'gives every table in public exactly one policy'
);

select is_empty(
  $$
    select tablename, policyname
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and not (
        permissive = 'PERMISSIVE'
        and cmd = 'SELECT'
        and roles = array['anon']::name[]
        and qual = 'true'
      )
  $$,
  'makes every policy in public a permissive select for anon using true'
);

select * from finish();
rollback;
