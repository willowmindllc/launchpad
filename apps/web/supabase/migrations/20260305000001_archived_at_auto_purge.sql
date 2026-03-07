-- Add archived_at timestamp to projects
alter table projects add column if not exists archived_at timestamptz;

-- Backfill: set archived_at for already-archived projects
update projects set archived_at = updated_at where archived = true and archived_at is null;

-- Auto-set archived_at when archived flag changes
create or replace function set_archived_at()
returns trigger as $$
begin
  if NEW.archived = true and (OLD.archived = false or OLD.archived is null) then
    NEW.archived_at = now();
  elsif NEW.archived = false then
    NEW.archived_at = null;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_set_archived_at
  before update on projects
  for each row
  execute function set_archived_at();

-- Purge function: delete projects archived > 7 days and tasks soft-deleted > 7 days
create or replace function purge_expired_archives()
returns void as $$
begin
  -- Delete tasks belonging to archived projects being purged
  delete from tasks where project_id in (
    select id from projects where archived = true and archived_at < now() - interval '7 days'
  );
  -- Delete the archived projects
  delete from projects where archived = true and archived_at < now() - interval '7 days';
  -- Delete soft-deleted tasks older than 7 days
  delete from tasks where deleted_at is not null and deleted_at < now() - interval '7 days';
end;
$$ language plpgsql security definer;

-- Schedule daily purge at 3am UTC via pg_cron (if available)
-- Note: pg_cron must be enabled in Supabase dashboard (Database > Extensions)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('purge-expired-archives', '0 3 * * *', 'select purge_expired_archives()');
  end if;
end $$;
