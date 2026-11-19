alter table public.course_payments
  alter column course_id drop not null,
  add column if not exists plan text not null default 'course';

alter table public.course_payments
  drop constraint if exists course_payments_amount_kobo_check,
  drop constraint if exists course_payments_plan_check;

alter table public.course_payments
  add constraint course_payments_plan_check check (
    (plan = 'course' and course_id is not null and amount_kobo = 500000)
    or (plan = 'bundle' and course_id is null and amount_kobo = 2500000)
  );

create table if not exists public.course_bundle_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payment_reference text not null unique,
  amount_kobo integer not null check (amount_kobo = 2500000),
  status text not null default 'active' check (status in ('active', 'revoked')),
  granted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.course_bundle_access enable row level security;

drop policy if exists "Learners read own bundle access and admins read all" on public.course_bundle_access;
create policy "Learners read own bundle access and admins read all"
  on public.course_bundle_access for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_skill_up_admin()));

drop policy if exists "Admins manage bundle access" on public.course_bundle_access;
create policy "Admins manage bundle access"
  on public.course_bundle_access for all to authenticated
  using ((select public.is_skill_up_admin()))
  with check ((select public.is_skill_up_admin()));

revoke all on public.course_bundle_access from public, anon, authenticated;
grant select, insert, update on public.course_bundle_access to authenticated;
grant all on public.course_bundle_access to service_role;

create or replace function public.can_access_course_material(
  p_course_id text,
  p_object_path text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select public.is_skill_up_admin())
    or exists (
      select 1
      from public.app_workspaces as workspace
      cross join lateral jsonb_array_elements(
        case
          when jsonb_typeof(workspace.data->'courses') = 'array'
            then workspace.data->'courses'
          else '[]'::jsonb
        end
      ) as courses(course)
      cross join lateral jsonb_array_elements(
        case
          when jsonb_typeof(courses.course->'moduleMaterials') = 'array'
            then courses.course->'moduleMaterials'
          else '[]'::jsonb
        end
      ) with ordinality as materials(item, module_number)
      where workspace.workspace_key = 'public'
        and courses.course->>'id' = p_course_id
        and materials.item->>'path' = p_object_path
        and (
          (
            materials.module_number = 1
            and courses.course->>'status' = 'Published'
          )
          or exists (
            select 1
            from public.course_access as access
            where access.user_id = (select auth.uid())
              and access.course_id = p_course_id
              and access.status = 'active'
          )
          or exists (
            select 1
            from public.course_bundle_access as bundle
            where bundle.user_id = (select auth.uid())
              and bundle.status = 'active'
          )
        )
    );
$$;

drop policy if exists "Learners read free previews and unlocked course materials" on storage.objects;
create policy "Learners read free previews and unlocked course materials"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'course-videos'
    and (select public.can_access_course_material(split_part(name, '/', 1), name))
  );

update public.referral_program_settings
set commission_rate = 20, updated_at = now()
where singleton = true;

alter table public.referral_program_settings
  alter column commission_rate set default 20;

create table if not exists public.referral_payout_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  account_holder_name text not null check (char_length(btrim(account_holder_name)) between 2 and 120),
  bank_name text not null check (char_length(btrim(bank_name)) between 2 and 120),
  account_number text not null check (account_number ~ '^[0-9]{6,20}$'),
  updated_at timestamptz not null default now()
);

create table if not exists public.referral_withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'rejected')),
  account_holder_name text not null,
  bank_name text not null,
  account_number text not null,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references auth.users (id) on delete set null
);

create index if not exists referral_withdrawals_user_created_idx
  on public.referral_withdrawals (user_id, created_at desc);

alter table public.referral_payout_accounts enable row level security;
alter table public.referral_withdrawals enable row level security;

drop policy if exists "Learners read own payout account and admins read all" on public.referral_payout_accounts;
create policy "Learners read own payout account and admins read all"
  on public.referral_payout_accounts for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_skill_up_admin()));

drop policy if exists "Learners insert own payout account" on public.referral_payout_accounts;
create policy "Learners insert own payout account"
  on public.referral_payout_accounts for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Learners update own payout account" on public.referral_payout_accounts;
create policy "Learners update own payout account"
  on public.referral_payout_accounts for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Learners read own withdrawals and admins read all" on public.referral_withdrawals;
create policy "Learners read own withdrawals and admins read all"
  on public.referral_withdrawals for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_skill_up_admin()));

revoke all on public.referral_payout_accounts, public.referral_withdrawals from public, anon, authenticated;
grant select, insert, update on public.referral_payout_accounts to authenticated;
grant select on public.referral_withdrawals to authenticated;
grant all on public.referral_payout_accounts, public.referral_withdrawals to service_role;

create or replace function public.request_referral_withdrawal(p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_account public.referral_payout_accounts%rowtype;
  v_earned numeric(12, 2);
  v_reserved numeric(12, 2);
  v_available numeric(12, 2);
  v_amount numeric(12, 2);
  v_withdrawal public.referral_withdrawals%rowtype;
begin
  if v_user_id is null then
    raise exception 'Sign in to request a withdrawal.';
  end if;
  perform 1 from public.profiles
  where id = v_user_id and role in ('learner', 'user')
  for update;
  if not found then
    raise exception 'Only learner accounts can request referral withdrawals.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter a withdrawal amount greater than zero.';
  end if;
  v_amount := round(p_amount, 2);
  if v_amount <= 0 then
    raise exception 'The withdrawal amount must be at least one kobo (₦0.01).';
  end if;
  select * into v_account
  from public.referral_payout_accounts
  where user_id = v_user_id;
  if not found then
    raise exception 'Save your bank account details before requesting a withdrawal.';
  end if;

  select coalesce(sum(commission_amount), 0)::numeric(12, 2)
  into v_earned
  from public.referral_commissions
  where referrer_user_id = v_user_id and status = 'pending';
  select coalesce(sum(amount), 0)::numeric(12, 2)
  into v_reserved
  from public.referral_withdrawals
  where user_id = v_user_id and status in ('pending', 'paid');
  v_available := greatest(0, v_earned - v_reserved);
  if v_amount > v_available then
    raise exception 'The withdrawal amount exceeds your available referral balance.';
  end if;

  insert into public.referral_withdrawals (
    user_id, amount, account_holder_name, bank_name, account_number
  )
  values (
    v_user_id, v_amount, v_account.account_holder_name, v_account.bank_name, v_account.account_number
  )
  returning * into v_withdrawal;
  return jsonb_build_object(
    'id', v_withdrawal.id,
    'amount', v_withdrawal.amount,
    'status', v_withdrawal.status,
    'created_at', v_withdrawal.created_at
  );
end;
$$;

create or replace function public.review_referral_withdrawal(p_withdrawal_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.is_skill_up_admin()) then
    raise exception 'Administrator access is required to review withdrawals.';
  end if;
  if p_status not in ('paid', 'rejected') then
    raise exception 'A withdrawal can only be marked paid or rejected.';
  end if;
  update public.referral_withdrawals
  set status = p_status, processed_at = now(), processed_by = (select auth.uid())
  where id = p_withdrawal_id and status = 'pending';
  if not found then
    raise exception 'This withdrawal is no longer pending.';
  end if;
  return true;
end;
$$;

create or replace function public.get_my_referral_payout_summary()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'earned', coalesce((
      select sum(c.commission_amount)
      from public.referral_commissions c
      where c.referrer_user_id = p.id and c.status = 'pending'
    ), 0),
    'available', greatest(0, coalesce((
      select sum(c.commission_amount)
      from public.referral_commissions c
      where c.referrer_user_id = p.id and c.status = 'pending'
    ), 0) - coalesce((
      select sum(w.amount)
      from public.referral_withdrawals w
      where w.user_id = p.id and w.status in ('pending', 'paid')
    ), 0)),
    'account', (
      select jsonb_build_object(
        'account_holder_name', a.account_holder_name,
        'bank_name', a.bank_name,
        'account_number', a.account_number
      )
      from public.referral_payout_accounts a
      where a.user_id = p.id
    ),
    'withdrawals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', w.id,
        'amount', w.amount,
        'status', w.status,
        'created_at', w.created_at
      ) order by w.created_at desc)
      from (
        select id, amount, status, created_at
        from public.referral_withdrawals
        where user_id = p.id
        order by created_at desc
        limit 20
      ) w
    ), '[]'::jsonb)
  )
  from public.profiles p
  where p.id = (select auth.uid()) and p.role in ('learner', 'user');
$$;

create or replace function public.record_referral_conversion(
  p_referred_user_id uuid,
  p_course_id text,
  p_payment_id text,
  p_amount numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_referrer_id uuid;
  v_rate numeric(5, 2);
  v_existing public.referral_commissions%rowtype;
  v_inserted integer;
begin
  if coalesce((select auth.role()), '') <> 'service_role'
     and not coalesce((select public.is_skill_up_admin()), false) then
    raise exception 'Only verified payments or administrators can record a referral conversion.';
  end if;
  if p_referred_user_id is null or nullif(btrim(p_course_id), '') is null
     or nullif(btrim(p_payment_id), '') is null or p_amount is null or p_amount <= 0 then
    raise exception 'A valid learner, plan, payment reference, and positive verified amount are required.';
  end if;

  select * into v_existing
  from public.referral_commissions
  where payment_id = btrim(p_payment_id);
  if found then
    if v_existing.referred_user_id <> p_referred_user_id
       or v_existing.course_id <> btrim(p_course_id)
       or v_existing.gross_amount <> round(p_amount, 2) then
      raise exception 'This payment reference has already been recorded with different details.';
    end if;
    return jsonb_build_object('credited', true, 'commission', v_existing.commission_amount, 'duplicate', true);
  end if;

  select a.referrer_user_id into v_referrer_id
  from public.referral_attributions a
  where a.referred_user_id = p_referred_user_id;
  if v_referrer_id is null then
    return jsonb_build_object('credited', false, 'commission', 0, 'duplicate', false);
  end if;

  select commission_rate into v_rate
  from public.referral_program_settings
  where singleton = true;
  if v_rate is null then
    raise exception 'The referral commission rate is not configured.';
  end if;

  insert into public.referral_commissions (
    referred_user_id, referrer_user_id, course_id, payment_id, gross_amount,
    commission_rate, commission_amount
  )
  values (
    p_referred_user_id,
    v_referrer_id,
    btrim(p_course_id),
    btrim(p_payment_id),
    round(p_amount, 2),
    v_rate,
    round(p_amount * v_rate / 100, 2)
  )
  on conflict (payment_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    select * into v_existing
    from public.referral_commissions
    where payment_id = btrim(p_payment_id);
    if v_existing.referred_user_id <> p_referred_user_id
       or v_existing.course_id <> btrim(p_course_id)
       or v_existing.gross_amount <> round(p_amount, 2) then
      raise exception 'This payment reference has already been recorded with different details.';
    end if;
    return jsonb_build_object('credited', true, 'commission', v_existing.commission_amount, 'duplicate', true);
  end if;

  return jsonb_build_object(
    'credited', true,
    'commission', round(p_amount * v_rate / 100, 2),
    'duplicate', false
  );
end;
$$;

revoke all on function public.request_referral_withdrawal(numeric) from public, anon;
revoke all on function public.review_referral_withdrawal(uuid, text) from public, anon;
revoke all on function public.get_my_referral_payout_summary() from public, anon;
revoke all on function public.record_referral_conversion(uuid, text, text, numeric) from public, anon;
grant execute on function public.request_referral_withdrawal(numeric) to authenticated;
grant execute on function public.review_referral_withdrawal(uuid, text) to authenticated;
grant execute on function public.get_my_referral_payout_summary() to authenticated;
grant execute on function public.record_referral_conversion(uuid, text, text, numeric) to authenticated, service_role;
