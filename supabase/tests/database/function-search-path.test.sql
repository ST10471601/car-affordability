begin;
select plan(2);

select is(
  (select proconfig from pg_catalog.pg_proc where oid = 'public.set_updated_at()'::regprocedure),
  array['search_path=""'],
  'pins the search path of set_updated_at to an empty string'
);

select is(
  (select proconfig from pg_catalog.pg_proc where oid = 'public.reject_append_only_change()'::regprocedure),
  array['search_path=""'],
  'pins the search path of reject_append_only_change to an empty string'
);

select * from finish();
rollback;
