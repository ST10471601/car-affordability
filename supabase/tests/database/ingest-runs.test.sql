begin;
select plan(17);

create function pg_temp.insert_run(
  job text default 'listings',
  status text default 'running',
  finished_at timestamptz default null,
  rows_written integer default null,
  error_message text default null
)
returns void
language sql
as $$
  insert into ingest.runs (job, status, finished_at, rows_written, error_message)
  values (
    insert_run.job,
    insert_run.status,
    insert_run.finished_at,
    insert_run.rows_written,
    insert_run.error_message
  );
$$;

select lives_ok(
  format('select pg_temp.insert_run(job => %L)', job),
  format('accepts a running %s run', job)
)
from unnest(array['catalogue', 'listings', 'rates', 'backup']) as job;

select throws_ok(
  format('select pg_temp.insert_run(job => %L)', job),
  '23514',
  'new row for relation "runs" violates check constraint "runs_job_check"',
  format('rejects job %L', job)
)
from unnest(array['catalog', 'Listings']) as job;

select lives_ok(
  $$select pg_temp.insert_run(status => 'succeeded', finished_at => now(), rows_written => 120)$$,
  'accepts a succeeded run with its finish time and rows written'
);

select lives_ok(
  $$
    select pg_temp.insert_run(
      status => 'failed',
      finished_at => now(),
      error_message => 'AutoTrader returned HTTP 503'
    )
  $$,
  'accepts a failed run with its finish time and error message'
);

select throws_ok(
  format('select pg_temp.insert_run(status => %L, finished_at => now())', status),
  '23514',
  'new row for relation "runs" violates check constraint "runs_status_check"',
  format('rejects status %L', status)
)
from unnest(array['queued', 'Succeeded']) as status;

select throws_ok(
  $$select pg_temp.insert_run(status => 'running', finished_at => now())$$,
  '23514',
  'new row for relation "runs" violates check constraint "runs_finished_at_status_check"',
  'rejects a running run with a finish time'
);

select throws_ok(
  $$select pg_temp.insert_run(status => 'succeeded')$$,
  '23514',
  'new row for relation "runs" violates check constraint "runs_finished_at_status_check"',
  'rejects a succeeded run without a finish time'
);

select throws_ok(
  $$select pg_temp.insert_run(status => 'failed', error_message => 'Timed out')$$,
  '23514',
  'new row for relation "runs" violates check constraint "runs_finished_at_status_check"',
  'rejects a failed run without a finish time'
);

select lives_ok(
  $$select pg_temp.insert_run(status => 'succeeded', finished_at => now(), rows_written => 0)$$,
  'accepts a run that wrote zero rows'
);

select throws_ok(
  $$select pg_temp.insert_run(status => 'succeeded', finished_at => now(), rows_written => -1)$$,
  '23514',
  'new row for relation "runs" violates check constraint "runs_rows_written_check"',
  'rejects a negative number of rows written'
);

select throws_ok(
  $$select pg_temp.insert_run(status => 'succeeded', finished_at => now(), error_message => 'Partial failure')$$,
  '23514',
  'new row for relation "runs" violates check constraint "runs_error_message_status_check"',
  'rejects an error message on a succeeded run'
);

select throws_ok(
  $$select pg_temp.insert_run(status => 'running', error_message => 'Partial failure')$$,
  '23514',
  'new row for relation "runs" violates check constraint "runs_error_message_status_check"',
  'rejects an error message on a running run'
);

select * from finish();
rollback;
