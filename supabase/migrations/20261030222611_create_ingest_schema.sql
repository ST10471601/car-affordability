create schema ingest;

revoke all on schema ingest from public, anon, authenticated;
grant usage on schema ingest to service_role;

create table ingest.runs (
  id bigint generated always as identity primary key,
  job text not null check (job in ('catalogue', 'listings', 'rates', 'backup')),
  status text not null check (status in ('running', 'succeeded', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_written integer check (rows_written >= 0),
  error_message text,
  constraint runs_finished_at_status_check check (
    (finished_at is null) = (status = 'running')
  ),
  constraint runs_error_message_status_check check (
    error_message is null or status = 'failed'
  )
);

create table ingest.variant_source_refs (
  source text not null check (source ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  external_ref text not null,
  variant_id bigint not null references public.variants (id) on delete cascade,
  primary key (source, external_ref)
);

create index variant_source_refs_variant_id_idx
on ingest.variant_source_refs (variant_id);

revoke all on all tables in schema ingest from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema ingest to service_role;

alter table ingest.runs enable row level security;
alter table ingest.variant_source_refs enable row level security;
