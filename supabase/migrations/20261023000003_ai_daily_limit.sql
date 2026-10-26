-- =====================================================================
-- Per-family daily AI message counter, used by the claude-proxy function.
-- The day resets at midnight Sydney time.
-- =====================================================================

create table if not exists public.ai_usage (
  family_id     uuid not null references public.families(id) on delete cascade,
  usage_date    date not null,
  message_count integer not null default 0,
  primary key (family_id, usage_date)
);

alter table public.ai_usage enable row level security;

-- Family members can see their own count. Nobody can edit it from the
-- browser; only the server function (via consume_ai_message) changes it.
drop policy if exists ai_usage_select on public.ai_usage;
create policy ai_usage_select on public.ai_usage for select to authenticated
  using (public.is_family_member(family_id));

-- Atomically uses up one message if the family is under the limit.
-- Safe when several family members send at the same moment.
create or replace function public.consume_ai_message(p_family_id uuid, p_limit integer default 30)
returns table (allowed boolean, used integer, daily_limit integer)
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Australia/Sydney')::date;
  new_count integer;
begin
  insert into ai_usage as u (family_id, usage_date, message_count)
  values (p_family_id, today, 1)
  on conflict (family_id, usage_date)
    do update set message_count = u.message_count + 1
    where u.message_count < p_limit
  returning u.message_count into new_count;

  if new_count is null then
    select message_count into new_count from ai_usage
     where family_id = p_family_id and usage_date = today;
    return query select false, new_count, p_limit;
  else
    return query select true, new_count, p_limit;
  end if;
end $$;

revoke execute on function public.consume_ai_message(uuid, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_message(uuid, integer) to service_role;
