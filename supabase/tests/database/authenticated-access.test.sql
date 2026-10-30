begin;
select plan(9);

select is_empty(
  $$
    select relations.relname, privileges.privilege
    from pg_catalog.pg_class as relations
    cross join unnest(
      array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN']
    ) as privileges (privilege)
    where relations.relnamespace = 'public'::regnamespace
      and relations.relkind in ('r', 'p', 'v', 'm', 'f')
      and has_table_privilege('authenticated', relations.oid, privileges.privilege)
  $$,
  'grants authenticated nothing on tables and views in public'
);

select is_empty(
  $$
    select sequences.relname, privileges.privilege
    from pg_catalog.pg_class as sequences
    cross join unnest(array['USAGE', 'SELECT', 'UPDATE']) as privileges (privilege)
    where sequences.relnamespace = 'public'::regnamespace
      and sequences.relkind = 'S'
      and has_sequence_privilege('authenticated', sequences.oid, privileges.privilege)
  $$,
  'grants authenticated nothing on sequences in public'
);

set local role authenticated;

select throws_ok(
  format('select * from public.%I', relations.name),
  '42501',
  format('permission denied for %s %s', relations.kind, relations.name),
  format('authenticated cannot select from %s', relations.name)
)
from (
  values
    ('brands', 'table'),
    ('models', 'table'),
    ('variants', 'table'),
    ('listings', 'table'),
    ('config_versions', 'table'),
    ('current_config', 'view'),
    ('data_freshness', 'table')
) as relations (name, kind);

select * from finish();
rollback;
