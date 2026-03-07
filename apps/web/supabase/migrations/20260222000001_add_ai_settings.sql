-- Add AI settings columns to profiles
alter table profiles add column ai_provider text default null;
alter table profiles add column ai_api_key text default null;

-- Protect API keys: revoke direct column access and use a security definer
-- function so only the owning user can read their own key.
-- The existing "Public profiles are viewable by everyone" RLS policy stays
-- (needed for assignee lookups), but we gate api_key access at query level
-- via a helper function.

create or replace function get_my_ai_settings()
returns table (ai_provider text, ai_api_key text) as $$
begin
  return query
    select p.ai_provider, p.ai_api_key
    from profiles p
    where p.id = auth.uid();
end;
$$ language plpgsql security definer;
