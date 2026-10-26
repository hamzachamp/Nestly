-- =====================================================================
-- Family isolation: every family can only see and change its own rows.
-- Safe to run more than once.
-- =====================================================================

-- Helper checks. SECURITY DEFINER lets policies look up membership without
-- the family_members policy recursively checking itself.
create or replace function public.is_family_member(p_family_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from family_members where family_id = p_family_id and user_id = auth.uid());
$$;

create or replace function public.is_family_owner(p_family_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from families where id = p_family_id and owner_id = auth.uid());
$$;

-- Remove any older policies on these tables so a leftover permissive rule
-- can't keep a hole open (Postgres combines policies with OR).
do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies
           where schemaname = 'public'
             and tablename in ('families','family_members','family_invites','family_data','user_data')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

alter table public.families       enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invites enable row level security;
alter table public.family_data    enable row level security;
alter table public.user_data      enable row level security;

-- families: members read; anyone signed in can create their own; owner edits/deletes.
-- (owner_id check on select lets the app read back the family it just created.)
create policy families_select on public.families for select to authenticated
  using (public.is_family_member(id) or owner_id = auth.uid());
create policy families_insert on public.families for insert to authenticated
  with check (owner_id = auth.uid());
create policy families_update on public.families for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy families_delete on public.families for delete to authenticated
  using (owner_id = auth.uid());

-- family_members: members see their family; you can only add yourself as owner
-- of a family you created (invitees join via accept_family_invite below);
-- only the owner removes people.
create policy family_members_select on public.family_members for select to authenticated
  using (public.is_family_member(family_id));
create policy family_members_insert on public.family_members for insert to authenticated
  with check (user_id = auth.uid() and role = 'owner' and public.is_family_owner(family_id));
create policy family_members_delete on public.family_members for delete to authenticated
  using (public.is_family_owner(family_id));

-- family_invites: members see their family's invites; only the owner creates/revokes.
create policy family_invites_select on public.family_invites for select to authenticated
  using (public.is_family_member(family_id));
create policy family_invites_insert on public.family_invites for insert to authenticated
  with check (public.is_family_owner(family_id) and invited_by = auth.uid());
create policy family_invites_delete on public.family_invites for delete to authenticated
  using (public.is_family_owner(family_id));

-- family_data: any member of the family reads and saves it.
create policy family_data_select on public.family_data for select to authenticated
  using (public.is_family_member(family_id));
create policy family_data_insert on public.family_data for insert to authenticated
  with check (public.is_family_member(family_id));
create policy family_data_update on public.family_data for update to authenticated
  using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));
create policy family_data_delete on public.family_data for delete to authenticated
  using (public.is_family_member(family_id));

-- user_data (legacy, pre-family): each person only their own row.
create policy user_data_own on public.user_data for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Accepting an invite. Previously the app looked the invite up directly,
-- which required every signed-in user to be able to read every invite token.
-- Now the check happens here, server-side, and only the token holder can join.
create or replace function public.accept_family_invite(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv family_invites%rowtype;
begin
  if auth.uid() is null then return null; end if;
  if exists (select 1 from family_members where user_id = auth.uid()) then return null; end if;
  select * into inv from family_invites
   where token = p_token and not coalesce(accepted, false) and expires_at > now()
   for update;
  if not found then return null; end if;
  insert into family_members (family_id, user_id, email, role)
  values (inv.family_id, auth.uid(), (select email from auth.users where id = auth.uid()), 'member');
  update family_invites set accepted = true, accepted_by = auth.uid() where id = inv.id;
  return inv.family_id;
end $$;

revoke execute on function public.accept_family_invite(text) from public, anon;
grant execute on function public.accept_family_invite(text) to authenticated;
