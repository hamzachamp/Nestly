-- Nestly household assistant: messaging channel links, link codes, send log, usage cap.
-- Run once in the Supabase SQL editor (or `supabase db push`).
-- Assumes existing tables: public.families(id uuid), public.family_members(family_id, user_id), public.family_data.

-- 1) A linked messaging account (one row per person per channel) -----------------
create table if not exists public.channel_links (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null default 'telegram' check (channel in ('telegram', 'whatsapp')),
  chat_id text not null,
  person_name text,                       -- which household member this account is ("Hamza")
  timezone text not null default 'Australia/Sydney',
  brief_hour smallint not null default 7 check (brief_hour between 0 and 23),
  brief_enabled boolean not null default true,
  reminders_enabled boolean not null default true,
  last_brief_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (channel, chat_id)
);
create index if not exists channel_links_family_idx on public.channel_links (family_id);
alter table public.channel_links enable row level security;

drop policy if exists "own links read" on public.channel_links;
create policy "own links read" on public.channel_links
  for select using (user_id = auth.uid());
drop policy if exists "own links update" on public.channel_links;
create policy "own links update" on public.channel_links
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own links delete" on public.channel_links;
create policy "own links delete" on public.channel_links
  for delete using (user_id = auth.uid());
-- No insert policy on purpose: links are only created by the telegram-webhook function (service role).

-- 2) One-time codes used to connect Telegram from inside the app ------------------
create table if not exists public.link_codes (
  code text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  person_name text,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.link_codes enable row level security;

drop policy if exists "members create codes" on public.link_codes;
create policy "members create codes" on public.link_codes
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.family_members fm
      where fm.family_id = link_codes.family_id and fm.user_id = auth.uid()
    )
  );
drop policy if exists "own codes read" on public.link_codes;
create policy "own codes read" on public.link_codes
  for select using (user_id = auth.uid());

-- 3) Dedupe log so a reminder is never sent twice -----------------------------------
create table if not exists public.assistant_sent (
  family_id uuid not null,
  link_id uuid not null references public.channel_links(id) on delete cascade,
  key text not null,
  sent_at timestamptz not null default now(),
  primary key (link_id, key)
);
alter table public.assistant_sent enable row level security;   -- service role only

-- 4) Daily AI-message cap per family (protects margin) -------------------------------
create table if not exists public.assistant_usage (
  family_id uuid not null,
  day date not null,
  count integer not null default 0,
  primary key (family_id, day)
);
alter table public.assistant_usage enable row level security;  -- service role only

-- Atomically bump usage; returns the new count, or -1 if the cap was already reached.
create or replace function public.assistant_bump_usage(p_family uuid, p_day date, p_cap integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  insert into public.assistant_usage (family_id, day, count)
  values (p_family, p_day, 0)
  on conflict (family_id, day) do nothing;

  update public.assistant_usage
     set count = count + 1
   where family_id = p_family and day = p_day and count < p_cap
  returning count into new_count;

  if new_count is null then
    return -1;
  end if;
  return new_count;
end;
$$;
revoke all on function public.assistant_bump_usage(uuid, date, integer) from public, anon, authenticated;
