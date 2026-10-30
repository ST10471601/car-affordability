create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

alter default privileges for role postgres in schema public
revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
revoke all on sequences from anon, authenticated;

alter default privileges for role postgres in schema public
revoke all on functions from anon, authenticated;

grant select on table
  public.brands,
  public.models,
  public.variants,
  public.listings,
  public.config_versions,
  public.current_config,
  public.data_freshness
to anon;

create policy anon_select on public.brands for select to anon using (true);
create policy anon_select on public.models for select to anon using (true);
create policy anon_select on public.variants for select to anon using (true);
create policy anon_select on public.listings for select to anon using (true);
create policy anon_select on public.config_versions for select to anon using (true);
create policy anon_select on public.data_freshness for select to anon using (true);
