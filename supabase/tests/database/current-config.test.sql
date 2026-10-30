begin;
select plan(2);

insert into public.config_versions (key, value, effective_from)
values
  ('finance_rules', '{"version": 1}', current_date - 60),
  ('finance_rules', '{"version": 2}', current_date - 30),
  ('finance_rules', '{"version": 3}', current_date + 1),
  ('verdict_thresholds', '{"version": 1}', current_date),
  ('usage_defaults', '{"version": 1}', current_date + 30);

select results_eq(
  'select key, value from public.current_config order by key',
  $$
    values
      ('finance_rules', '{"version": 2}'::jsonb),
      ('verdict_thresholds', '{"version": 1}'::jsonb)
  $$,
  'returns the latest version of each key that is in effect today'
);

select is_empty(
  'select key from public.current_config where effective_from > current_date',
  'ignores versions that take effect in the future'
);

select * from finish();
rollback;
