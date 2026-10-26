-- =====================================================================
-- Messaging consent: a record of who agreed to be contacted, on which
-- channel, when, and when (if ever) they withdrew it.
-- =====================================================================

create table if not exists public.consent_messaging (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  consented_at timestamptz not null default now(),
  channel      text not null,
  revoked_at   timestamptz
);
create index if not exists consent_messaging_user_id_idx on public.consent_messaging (user_id);

alter table public.consent_messaging enable row level security;

-- Each person sees and manages only their own consent. No delete policy:
-- withdrawing consent sets revoked_at, so the record stays as evidence.
drop policy if exists consent_messaging_select on public.consent_messaging;
drop policy if exists consent_messaging_insert on public.consent_messaging;
drop policy if exists consent_messaging_update on public.consent_messaging;
create policy consent_messaging_select on public.consent_messaging for select to authenticated
  using (user_id = auth.uid());
create policy consent_messaging_insert on public.consent_messaging for insert to authenticated
  with check (user_id = auth.uid());
create policy consent_messaging_update on public.consent_messaging for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Signup writes consent here. The app passes messaging_consent in the signup
-- metadata; this trigger records it the moment the account is created, with
-- the server's clock. It works even when email confirmation is switched on
-- (when the browser isn't signed in yet and couldn't write the row itself).
create or replace function public.record_signup_messaging_consent()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.raw_user_meta_data->>'messaging_consent', '') = 'true' then
    insert into public.consent_messaging (user_id, channel)
    values (new.id, coalesce(nullif(new.raw_user_meta_data->>'messaging_channel', ''), 'email'));
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created_messaging_consent on auth.users;
create trigger on_auth_user_created_messaging_consent
  after insert on auth.users
  for each row execute function public.record_signup_messaging_consent();
