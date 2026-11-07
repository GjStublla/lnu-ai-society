-- Run against a disposable PostgreSQL/Supabase database as the migration owner.
begin;
set local plpgsql.check_asserts = on;

do $$
begin
  assert not has_function_privilege('anon', 'public.watthabit_rewards()', 'execute'),
    'anon can read rewards';
  assert not has_function_privilege('anon', 'public.watthabit_complete_challenge(text)', 'execute'),
    'anon can complete challenges';
  assert not has_function_privilege('anon', 'public.watthabit_redeem(text,text)', 'execute'),
    'anon can redeem vouchers';
  assert not has_any_column_privilege('anon', 'public.watthabit_profiles', 'select, insert, update'),
    'anon can access profiles';
  assert not has_any_column_privilege('anon', 'public.watthabit_challenge_completions', 'select, insert'),
    'anon can access completions';
  assert not has_any_column_privilege('anon', 'public.watthabit_voucher_redemptions', 'select, insert'),
    'anon can access redemptions';
end;
$$;

select set_config('watthabit.test_user_a', gen_random_uuid()::text, true);
select set_config('watthabit.test_user_b', gen_random_uuid()::text, true);
insert into auth.users (id)
values (current_setting('watthabit.test_user_a')::uuid),
       (current_setting('watthabit.test_user_b')::uuid);

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('watthabit.test_user_a'), true);
select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('watthabit.test_user_a'))::text, true);

do $$
declare
  v_other_user uuid := current_setting('watthabit.test_user_b')::uuid;
begin
  assert public.watthabit_rewards() = '{"points":0,"progress":0,"goal":5,"vouchers":[]}'::jsonb,
    'new accounts must start empty';

  insert into public.watthabit_profiles (region) values ('SE4');
  update public.watthabit_profiles set housing = 'included';
  assert (select housing from public.watthabit_profiles) = 'included', 'own profile update failed';

  begin
    insert into public.watthabit_profiles (user_id) values (v_other_user);
    raise exception 'cross-user profile insert unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;

  assert public.watthabit_complete_challenge('plan-laundry') =
    '{"progress":1,"goal":5,"rewardUnlocked":false,"demo":true}'::jsonb,
    'first completion did not award one stamp';
  assert public.watthabit_complete_challenge('plan-laundry') =
    '{"progress":1,"goal":5,"rewardUnlocked":false,"demo":true}'::jsonb,
    'same-day duplicate changed progress';

  begin
    perform public.watthabit_complete_challenge('unknown');
    raise exception 'unknown challenge unexpectedly accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.watthabit_challenge_completions (challenge_id, user_id)
    values ('plan-dishwasher', v_other_user);
    raise exception 'cross-user completion insert unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.watthabit_challenge_completions (challenge_id, completed_on)
    values ('plan-dishwasher', (statement_timestamp() at time zone 'Europe/Stockholm')::date - 1);
    raise exception 'backdated completion unexpectedly accepted';
  exception when insufficient_privilege then null;
  end;

  assert public.watthabit_redeem('demo-coffee', 'DEMO-COFFEE') = '{"status":"invalid","demo":true}'::jsonb,
    'premature redemption RPC unexpectedly succeeded';
  begin
    insert into public.watthabit_voucher_redemptions (voucher_id, code) values ('demo-coffee', 'DEMO-COFFEE');
    raise exception 'premature direct redemption unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- Seed a previous day as the migration owner to exercise cross-day completion and unlock.
reset role;
insert into public.watthabit_challenge_completions (user_id, challenge_id, completed_on)
select current_setting('watthabit.test_user_a')::uuid, challenge_id,
  (statement_timestamp() at time zone 'Europe/Stockholm')::date - 1
from (values ('plan-laundry'), ('plan-dishwasher'), ('learn-spot-prices')) as past(challenge_id);

set local role authenticated;
do $$
declare
  v_voucher jsonb := '{
    "id":"demo-coffee","title":"Demo coffee voucher (DEMO — NOT REDEEMABLE)",
    "code":"DEMO-COFFEE","isRedeemed":false,"demo":true
  }'::jsonb;
begin
  assert public.watthabit_rewards() = '{"points":4,"progress":4,"goal":5,"vouchers":[]}'::jsonb,
    'completion on a previous Stockholm date did not count';
  assert public.watthabit_complete_challenge('plan-dishwasher') =
    '{"progress":5,"goal":5,"rewardUnlocked":true,"demo":true}'::jsonb,
    'fifth stamp did not unlock voucher';
  perform public.watthabit_complete_challenge('plan-charging');
  assert public.watthabit_rewards() =
    jsonb_build_object('points', 6, 'progress', 5, 'goal', 5, 'vouchers', jsonb_build_array(v_voucher)),
    'wallet did not show exact points, capped progress, and demo voucher';
  assert public.watthabit_redeem('demo-coffee', 'wrong') = '{"status":"invalid","demo":true}'::jsonb,
    'wrong code unexpectedly accepted';
  assert public.watthabit_redeem('unknown', 'DEMO-COFFEE') = '{"status":"invalid","demo":true}'::jsonb,
    'unknown voucher unexpectedly accepted';
  begin
    insert into public.watthabit_voucher_redemptions (voucher_id, code) values ('demo-coffee', 'wrong');
    raise exception 'wrong code unexpectedly accepted in a direct insert';
  exception when check_violation then null;
  end;
  assert public.watthabit_redeem('demo-coffee', 'DEMO-COFFEE') = '{"status":"redeemed","demo":true}'::jsonb,
    'eligible redemption did not succeed';
  assert public.watthabit_redeem('demo-coffee', 'DEMO-COFFEE') =
    '{"status":"already_redeemed","demo":true}'::jsonb, 'duplicate redemption did not report prior success';
  assert public.watthabit_redeem('demo-coffee', 'wrong') = '{"status":"invalid","demo":true}'::jsonb,
    'wrong code disclosed redemption status';
  assert (select count(*) from public.watthabit_voucher_redemptions) = 1,
    'repeat redemption created another row';
  assert public.watthabit_rewards() =
    jsonb_build_object('points', 6, 'progress', 5, 'goal', 5, 'vouchers',
      jsonb_build_array(v_voucher || '{"isRedeemed":true}'::jsonb)),
    'wallet did not reflect durable redemption';
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('watthabit.test_user_b'), true);
select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('watthabit.test_user_b'))::text, true);

do $$
begin
  assert not exists (select 1 from public.watthabit_profiles), 'RLS exposed another profile';
  assert not exists (select 1 from public.watthabit_challenge_completions), 'RLS exposed another completion';
  assert not exists (select 1 from public.watthabit_voucher_redemptions), 'RLS exposed another redemption';
  assert public.watthabit_rewards() = '{"points":0,"progress":0,"goal":5,"vouchers":[]}'::jsonb,
    'wallet exposed another account';
  assert public.watthabit_redeem('demo-coffee', 'DEMO-COFFEE') = '{"status":"invalid","demo":true}'::jsonb,
    'second account could redeem another account''s voucher';
  assert public.watthabit_complete_challenge('plan-laundry') =
    '{"progress":1,"goal":5,"rewardUnlocked":false,"demo":true}'::jsonb,
    'one account prevented another account from recording the same challenge';
end;
$$;

rollback;
select 'WattHabit backend checks passed' as result;
