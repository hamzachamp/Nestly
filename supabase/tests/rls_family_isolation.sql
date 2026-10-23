-- =====================================================================
-- Nestly: family isolation test (row-level security)
--
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> New query -> paste this
-- whole file -> Run. The results table appears at the bottom.
--
-- WHAT IT DOES: creates two throwaway families (A and B) plus an outsider
-- with no family, signs in as each one exactly the way the app does, and
-- tries to read and change the other family's rows in every table.
-- Everything it creates is rolled back at the end, so no test data is left
-- behind and no real family's data is changed.
--
-- PASS = family A could not see or change family B's rows, and could still
-- see its own rows (so the app keeps working).
-- =====================================================================

create temp table if not exists rls_results (
  table_name text, reads_other_family text, changes_family_b text, sees_own_rows text, result text
);
truncate rls_results;

-- Runs one statement as a signed-in user, then undoes it.
-- Returns rows seen/changed, or -1 if the database refused.
create or replace function pg_temp.rls_try(p_uid uuid, p_sql text, p_is_read boolean)
returns int language plpgsql as $fn$
declare n int := 0;
begin
  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);
    if p_is_read then
      execute 'select count(*) from (' || p_sql || ') q' into n;
    else
      execute p_sql;
      get diagnostics n = row_count;
    end if;
    raise exception 'rls_try_undo';
  exception when others then
    if sqlerrm <> 'rls_try_undo' then n := -1; end if;
  end;
  return n;
end $fn$;

do $test$
declare
  ua uuid := gen_random_uuid();  -- parent in family A
  ub uuid := gen_random_uuid();  -- parent in family B
  uc uuid := gen_random_uuid();  -- outsider, no family yet
  fa uuid; fb uuid;
  res jsonb := '[]';
  t record;
  r_other int; w_b int; r_own int; verdict text;
begin
  begin -- everything in this block is rolled back at the end
    insert into auth.users (id, email, aud, role) values
      (ua, 'rls-test-a-' || ua || '@example.com', 'authenticated', 'authenticated'),
      (ub, 'rls-test-b-' || ub || '@example.com', 'authenticated', 'authenticated'),
      (uc, 'rls-test-c-' || uc || '@example.com', 'authenticated', 'authenticated');

    insert into families (name, owner_id) values ('RLS Test A', ua) returning id into fa;
    insert into families (name, owner_id) values ('RLS Test B', ub) returning id into fb;
    insert into family_members (family_id, user_id, email, role) values
      (fa, ua, 'a@example.com', 'owner'), (fb, ub, 'b@example.com', 'owner');
    insert into family_invites (family_id, token, invited_by) values
      (fa, 'inv_rlstest_a_' || ua, ua), (fb, 'inv_rlstest_b_' || ub, ub);
    insert into family_data (family_id, data, updated_by) values
      (fa, '{"familyName":"A"}', ua), (fb, '{"familyName":"B"}', ub);
    insert into user_data (user_id, data) values (ua, '{}'), (ub, '{}');
    if to_regclass('public.consent_messaging') is not null then
      execute format('insert into consent_messaging (user_id, channel) values (%L, ''email''), (%L, ''email'')', ua, ub);
    end if;
    if to_regclass('public.ai_usage') is not null then
      execute format('insert into ai_usage (family_id, usage_date, message_count) values (%L, current_date, 1), (%L, current_date, 1)', fa, fb);
    end if;

    -- name | read rows not belonging to A | change B's rows | read A's own rows
    for t in select * from (values
      ('families',
        format('select 1 from families where id <> %L', fa),
        format('update families set name = name where id = %L', fb),
        format('select 1 from families where id = %L', fa)),
      ('family_members',
        format('select 1 from family_members where family_id <> %L', fa),
        format('update family_members set role = role where family_id = %L', fb),
        format('select 1 from family_members where family_id = %L', fa)),
      ('family_members (outsider joins B uninvited)',
        null,
        format('insert into family_members (family_id, user_id, email, role) values (%L, %L, ''c@example.com'', ''member'')', fb, uc),
        null),
      ('family_invites',
        format('select 1 from family_invites where family_id <> %L', fa),
        format('update family_invites set accepted = accepted where family_id = %L', fb),
        format('select 1 from family_invites where family_id = %L', fa)),
      ('family_data',
        format('select 1 from family_data where family_id <> %L', fa),
        format('update family_data set data = data where family_id = %L', fb),
        format('select 1 from family_data where family_id = %L', fa)),
      ('user_data',
        format('select 1 from user_data where user_id <> %L', ua),
        format('update user_data set data = data where user_id = %L', ub),
        format('select 1 from user_data where user_id = %L', ua)),
      ('consent_messaging',
        format('select 1 from consent_messaging where user_id <> %L', ua),
        format('update consent_messaging set revoked_at = now() where user_id = %L', ub),
        format('select 1 from consent_messaging where user_id = %L', ua)),
      ('ai_usage',
        format('select 1 from ai_usage where family_id <> %L', fa),
        format('update ai_usage set message_count = 0 where family_id = %L', fb),
        format('select 1 from ai_usage where family_id = %L', fa))
    ) v(name, read_other, write_b, read_own)
    loop
      if to_regclass('public.' || split_part(t.name, ' ', 1)) is null then
        res := res || jsonb_build_array(jsonb_build_array(t.name, '-', '-', '-', 'SKIPPED (table does not exist yet)'));
        continue;
      end if;
      -- the outsider (no family) is the one trying to join; everyone else is parent A
      r_other := case when t.read_other is null then null else pg_temp.rls_try(ua, t.read_other, true) end;
      w_b     := pg_temp.rls_try(case when t.read_other is null then uc else ua end, t.write_b, false);
      r_own   := case when t.read_own is null then null else pg_temp.rls_try(ua, t.read_own, true) end;
      verdict := case
        when coalesce(r_other, 0) > 0 or w_b > 0 then 'FAIL - other family''s data exposed'
        when r_own is not null and r_own <= 0 then 'FAIL - family A locked out of own data'
        else 'PASS' end;
      res := res || jsonb_build_array(jsonb_build_array(
        t.name,
        case when r_other is null then '-' when r_other > 0 then 'YES (' || r_other || ' rows)' else 'no' end,
        case when w_b > 0 then 'YES' else 'no' end,
        case when r_own is null then '-' when r_own > 0 then 'yes' else 'NO' end,
        verdict));
    end loop;

    raise exception 'rls_test_rollback';
  exception when others then
    if sqlerrm <> 'rls_test_rollback' then raise; end if;
  end;

  insert into rls_results
  select e->>0, e->>1, e->>2, e->>3, e->>4 from jsonb_array_elements(res) e;
end $test$;

select * from rls_results;
