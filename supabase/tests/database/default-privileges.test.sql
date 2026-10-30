begin;
select plan(3);

create table public.default_privileges_probe (
  id bigint generated always as identity primary key
);

create sequence public.default_privileges_probe_counter;

create function public.default_privileges_probe()
returns integer
language sql
set search_path = ''
as $$
  select 1;
$$;

select is_empty(
  $$
    select roles.role, privileges.privilege
    from unnest(array['anon', 'authenticated']) as roles (role)
    cross join unnest(
      array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN']
    ) as privileges (privilege)
    where has_table_privilege(roles.role, 'public.default_privileges_probe', privileges.privilege)
  $$,
  'grants anon and authenticated nothing on a table created later'
);

select is_empty(
  $$
    select roles.role, sequences.oid::regclass, privileges.privilege
    from unnest(array['anon', 'authenticated']) as roles (role)
    cross join unnest(
      array['public.default_privileges_probe_counter', 'public.default_privileges_probe_id_seq']::regclass[]
    ) as sequences (oid)
    cross join unnest(array['USAGE', 'SELECT', 'UPDATE']) as privileges (privilege)
    where has_sequence_privilege(roles.role, sequences.oid, privileges.privilege)
  $$,
  'grants anon and authenticated nothing on sequences created later'
);

select is_empty(
  $$
    select grants.grantee::regrole, grants.privilege_type
    from pg_catalog.pg_proc as functions
    cross join lateral aclexplode(functions.proacl) as grants
    where functions.oid = 'public.default_privileges_probe()'::regprocedure
      and grants.grantee in ('anon'::regrole, 'authenticated'::regrole)
  $$,
  'grants anon and authenticated nothing directly on a function created later'
);

select * from finish();
rollback;
