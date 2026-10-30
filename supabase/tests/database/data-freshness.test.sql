begin;
select plan(8);

select throws_ok(
  $$insert into public.data_freshness (job, last_success_at) values ('catalogue', null)$$,
  '23502',
  'null value in column "last_success_at" of relation "data_freshness" violates not-null constraint',
  'rejects a job without a last success time'
);

select lives_ok(
  format(
    $$insert into public.data_freshness (job, last_success_at) values (%L, '2026-10-30 06:00:00+02')$$,
    job
  ),
  format('accepts job %L', job)
)
from unnest(array['catalogue', 'listings', 'rates']) as job;

select throws_ok(
  format(
    $$insert into public.data_freshness (job, last_success_at) values (%L, '2026-10-30 06:00:00+02')$$,
    job
  ),
  '23514',
  'new row for relation "data_freshness" violates check constraint "data_freshness_job_check"',
  format('rejects job %L', job)
)
from unnest(array['backup', 'Listings']) as job;

select throws_ok(
  $$insert into public.data_freshness (job, last_success_at) values ('rates', '2026-10-31 06:00:00+02')$$,
  '23505',
  'duplicate key value violates unique constraint "data_freshness_pkey"',
  'rejects a second row for the same job'
);

delete from public.data_freshness where job = 'rates';

insert into public.data_freshness (job, last_success_at, updated_at)
values ('rates', '2026-01-01 06:00:00+02', '2026-01-01 00:00:00+00');

update public.data_freshness
set last_success_at = '2026-10-30 06:00:00+02'
where job = 'rates';

select is(
  (select updated_at from public.data_freshness where job = 'rates'),
  now(),
  'sets updated_at when a job is updated'
);

select * from finish();
rollback;
