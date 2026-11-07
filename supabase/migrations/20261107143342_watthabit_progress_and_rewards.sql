create table public.watthabit_profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  region text not null default 'SE4' check (region in ('SE1', 'SE2', 'SE3', 'SE4')),
  housing text not null default 'unknown' check (housing in ('included', 'separate', 'unknown')),
  activities text[] not null default '{}' check (
    cardinality(activities) <= 3 and activities <@ array['laundry', 'dishwasher', 'charging']
  ),
  available_after text check (available_after ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);

create table public.watthabit_challenge_completions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  challenge_id text not null check (
    challenge_id in ('plan-laundry', 'plan-dishwasher', 'plan-charging', 'learn-spot-prices')
  ),
  completed_on date not null default ((statement_timestamp() at time zone 'Europe/Stockholm')::date),
  primary key (user_id, challenge_id, completed_on)
);

create table public.watthabit_voucher_redemptions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  voucher_id text not null check (voucher_id = 'demo-coffee'),
  code text not null check (code = 'DEMO-COFFEE'),
  redeemed_at timestamptz not null default statement_timestamp(),
  primary key (user_id, voucher_id)
);

alter table public.watthabit_profiles enable row level security;
alter table public.watthabit_challenge_completions enable row level security;
alter table public.watthabit_voucher_redemptions enable row level security;

revoke all on table
  public.watthabit_profiles,
  public.watthabit_challenge_completions,
  public.watthabit_voucher_redemptions
from public, anon, authenticated, service_role;

grant select, insert on public.watthabit_profiles to authenticated;
grant update (region, housing, activities, available_after) on public.watthabit_profiles to authenticated;
grant select on public.watthabit_challenge_completions, public.watthabit_voucher_redemptions to authenticated;

-- The caller supplies the action, while PostgreSQL assigns the user and date.
grant insert (challenge_id) on public.watthabit_challenge_completions to authenticated;
grant insert (voucher_id, code) on public.watthabit_voucher_redemptions to authenticated;

create policy watthabit_profiles_read_own on public.watthabit_profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy watthabit_profiles_insert_own on public.watthabit_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy watthabit_profiles_update_own on public.watthabit_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy watthabit_completions_read_own on public.watthabit_challenge_completions
  for select to authenticated using (user_id = (select auth.uid()));
create policy watthabit_completions_insert_today on public.watthabit_challenge_completions
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and completed_on = (select (statement_timestamp() at time zone 'Europe/Stockholm')::date)
  );

create policy watthabit_redemptions_read_own on public.watthabit_voucher_redemptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy watthabit_redemptions_insert_eligible on public.watthabit_voucher_redemptions
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and (
      select count(*) from public.watthabit_challenge_completions
      where user_id = (select auth.uid())
    ) >= 5
  );

create function public.watthabit_rewards()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with progress as (
    select count(*) as points
    from public.watthabit_challenge_completions
    where user_id = (select auth.uid())
  )
  select jsonb_build_object(
    'points', points,
    'progress', least(points, 5),
    'goal', 5,
    'vouchers', case when points >= 5 then
      jsonb_build_array(jsonb_build_object(
        'id', 'demo-coffee',
        'title', 'Demo coffee voucher (DEMO — NOT REDEEMABLE)',
        'code', 'DEMO-COFFEE',
        'isRedeemed', exists (
          select 1 from public.watthabit_voucher_redemptions
          where user_id = (select auth.uid()) and voucher_id = 'demo-coffee'
        ),
        'demo', true
      ))
    else '[]'::jsonb end
  )
  from progress
$$;

create function public.watthabit_complete_challenge(p_challenge_id text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_points bigint;
begin
  insert into public.watthabit_challenge_completions (challenge_id)
  values (p_challenge_id)
  on conflict (user_id, challenge_id, completed_on) do nothing;

  select count(*) into v_points
  from public.watthabit_challenge_completions
  where user_id = (select auth.uid());

  return jsonb_build_object(
    'progress', least(v_points, 5),
    'goal', 5,
    'rewardUnlocked', v_points >= 5,
    'demo', true
  );
end;
$$;

create function public.watthabit_redeem(p_voucher_id text, p_code text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text := 'invalid';
begin
  if p_voucher_id = 'demo-coffee' and p_code = 'DEMO-COFFEE' then
    insert into public.watthabit_voucher_redemptions (voucher_id, code)
    select p_voucher_id, p_code
    where (
      select count(*) from public.watthabit_challenge_completions
      where user_id = (select auth.uid())
    ) >= 5
    on conflict (user_id, voucher_id) do nothing;

    if found then
      v_status := 'redeemed';
    elsif exists (
      select 1 from public.watthabit_voucher_redemptions
      where user_id = (select auth.uid()) and voucher_id = p_voucher_id
    ) then
      v_status := 'already_redeemed';
    end if;
  end if;

  return jsonb_build_object('status', v_status, 'demo', true);
end;
$$;

revoke all on function
  public.watthabit_rewards(),
  public.watthabit_complete_challenge(text),
  public.watthabit_redeem(text, text)
from public, anon, authenticated, service_role;

grant execute on function
  public.watthabit_rewards(),
  public.watthabit_complete_challenge(text),
  public.watthabit_redeem(text, text)
to authenticated;
