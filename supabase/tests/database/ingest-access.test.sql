begin;
select plan(24);

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

create function pg_temp.ingest_statements()
returns table (tablename name, operation text, statement text)
language sql
as $$
  select
    tables.relname,
    operations.operation,
    case operations.operation
      when 'select' then format('select * from ingest.%I', tables.relname)
      when 'insert' then format('insert into ingest.%I default values', tables.relname)
      when 'update' then format('update ingest.%I set %I = default', tables.relname, first_column.attname)
      when 'delete' then format('delete from ingest.%I', tables.relname)
    end
  from pg_catalog.pg_class as tables
  join pg_catalog.pg_attribute as first_column
    on first_column.attrelid = tables.oid
    and first_column.attnum = 1
  cross join unnest(array['select', 'insert', 'update', 'delete']) as operations (operation)
  where tables.relnamespace = 'ingest'::regnamespace
    and tables.relkind in ('r', 'p')
  order by tables.relname, operations.operation;
$$;

set local role anon;

select throws_ok(
  statement,
  '42501',
  'permission denied for schema ingest',
  format('anon cannot %s ingest.%s', operation, tablename)
)
from pg_temp.ingest_statements();

set local role authenticated;

select throws_ok(
  statement,
  '42501',
  'permission denied for schema ingest',
  format('authenticated cannot %s ingest.%s', operation, tablename)
)
from pg_temp.ingest_statements();

set local role service_role;

select lives_ok(
  $$insert into ingest.runs (job, status) values ('listings', 'running')$$,
  'service_role can insert into ingest.runs'
);

select isnt_empty(
  'select * from ingest.runs',
  'service_role can select from ingest.runs'
);

select lives_ok(
  $$update ingest.runs set status = 'succeeded', finished_at = now(), rows_written = 120$$,
  'service_role can update ingest.runs'
);

select lives_ok(
  'delete from ingest.runs',
  'service_role can delete from ingest.runs'
);

select lives_ok(
  $$
    insert into ingest.variant_source_refs (source, external_ref, variant_id)
    select 'autotrader', 'toyota-corolla-cross-1-8-xs-hybrid', id
    from public.variants
    where slug = '1-8-xs-hybrid'
  $$,
  'service_role can insert into ingest.variant_source_refs'
);

select isnt_empty(
  'select * from ingest.variant_source_refs',
  'service_role can select from ingest.variant_source_refs'
);

select lives_ok(
  $$update ingest.variant_source_refs set external_ref = 'toyota-corolla-cross-hybrid'$$,
  'service_role can update ingest.variant_source_refs'
);

select lives_ok(
  'delete from ingest.variant_source_refs',
  'service_role can delete from ingest.variant_source_refs'
);

select * from finish();
rollback;
