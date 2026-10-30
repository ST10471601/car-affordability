begin;
select plan(21);

select lives_ok(
  format(
    $$insert into public.config_versions (key, value, effective_from) values (%L, '{}', '2026-01-01')$$,
    key
  ),
  format('accepts key %L', key)
)
from unnest(
  array[
    'running_cost_rates',
    'verdict_thresholds',
    'finance_rules',
    'finance_defaults',
    'affordability_limits',
    'usage_defaults'
  ]
) as key;

select throws_ok(
  format(
    $$insert into public.config_versions (key, value, effective_from) values (%L, '{}', '2026-01-01')$$,
    key
  ),
  '23514',
  'new row for relation "config_versions" violates check constraint "config_versions_key_check"',
  format('rejects key %L', key)
)
from unnest(array['runningCostRates', 'fuel_prices']) as key;

select throws_ok(
  format(
    $$insert into public.config_versions (key, value, effective_from) values ('finance_rules', %L, '2026-02-01')$$,
    value
  ),
  '23514',
  'new row for relation "config_versions" violates check constraint "config_versions_value_check"',
  format('rejects value %s', value)
)
from unnest(array['[]', '"finance"', '42', 'true', 'null']) as value;

select throws_ok(
  $$insert into public.config_versions (key, value, effective_from) values ('finance_rules', '{}', '2026-01-01')$$,
  '23505',
  'duplicate key value violates unique constraint "config_versions_key_effective_from_key"',
  'rejects a second version of a key with the same effective date'
);

select lives_ok(
  $$insert into public.config_versions (key, value, effective_from) values ('finance_rules', '{}', '2026-02-01')$$,
  'accepts a version of a key with a new effective date'
);

select throws_ok(
  $$update public.config_versions set value = '{"changed": true}'$$,
  'P0001',
  'public.config_versions is append-only',
  'rejects an update'
);

select throws_ok(
  'delete from public.config_versions',
  'P0001',
  'public.config_versions is append-only',
  'rejects a delete'
);

select throws_ok(
  'truncate public.config_versions',
  'P0001',
  'public.config_versions is append-only',
  'rejects a truncate'
);

set local role service_role;

select throws_ok(
  $$update public.config_versions set value = '{"changed": true}'$$,
  'P0001',
  'public.config_versions is append-only',
  'rejects an update by service_role'
);

select throws_ok(
  'delete from public.config_versions',
  'P0001',
  'public.config_versions is append-only',
  'rejects a delete by service_role'
);

select throws_ok(
  'truncate public.config_versions',
  'P0001',
  'public.config_versions is append-only',
  'rejects a truncate by service_role'
);

select * from finish();
rollback;
