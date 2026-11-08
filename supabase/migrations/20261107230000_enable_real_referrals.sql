alter table public.profiles
  add column if not exists referral_code text;

update public.profiles
set referral_code = 'SKILL-' || upper(substr(replace(id::text, '-', ''), 1, 12))
where referral_code is null or btrim(referral_code) = '';

create unique index if not exists profiles_referral_code_key
  on public.profiles (referral_code);

create table if not exists public.referral_attributions (
  referred_user_id uuid primary key references public.profiles (id) on delete cascade,
  referrer_user_id uuid not null references public.profiles (id) on delete cascade,
  referral_code text not null,
  created_at timestamptz not null default now(),
  constraint referral_attributions_no_self_referral check (referred_user_id <> referrer_user_id)
);

create index if not exists referral_attributions_referrer_idx
  on public.referral_attributions (referrer_user_id, created_at desc);

create table if not exists public.referral_commissions (
  id uuid primary key default gen_random_uuid(),
  referred_user_id uuid not null references public.profiles (id) on delete restrict,
  referrer_user_id uuid not null references public.profiles (id) on delete restrict,
  course_id text not null,
  payment_id text not null unique,
  gross_amount numeric(12, 2) not null check (gross_amount > 0),
  commission_rate numeric(5, 2) not null check (commission_rate >= 0 and commission_rate <= 100),
  commission_amount numeric(12, 2) not null check (commission_amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'reversed')),
  created_at timestamptz not null default now(),
  constraint referral_commissions_no_self_referral check (referred_user_id <> referrer_user_id)
);

create index if not exists referral_commissions_referrer_idx
  on public.referral_commissions (referrer_user_id, created_at desc);

create table if not exists public.referral_program_settings (
  singleton boolean primary key default true check (singleton),
  commission_rate numeric(5, 2) not null default 15 check (commission_rate >= 0 and commission_rate <= 100),
  updated_at timestamptz not null default now()
);

insert into public.referral_program_settings (singleton, commission_rate)
values (true, 15)
on conflict (singleton) do nothing;

create or replace function public.create_skill_up_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_referrer_id uuid;
  v_referral_code text;
begin
  insert into public.profiles (id, email, full_name, role, referral_code)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'learner',
    'SKILL-' || upper(substr(replace(new.id::text, '-', ''), 1, 12))
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = case
          when excluded.full_name = '' then public.profiles.full_name
          else excluded.full_name
        end,
        referral_code = coalesce(public.profiles.referral_code, excluded.referral_code);

  v_referral_code := upper(btrim(coalesce(new.raw_user_meta_data ->> 'referral_code', '')));
  if v_referral_code <> '' then
    select id into v_referrer_id
    from public.profiles
    where referral_code = v_referral_code
      and id <> new.id;

    if v_referrer_id is not null then
      insert into public.referral_attributions (referred_user_id, referrer_user_id, referral_code)
      values (new.id, v_referrer_id, v_referral_code)
      on conflict (referred_user_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

alter table public.referral_attributions enable row level security;
alter table public.referral_commissions enable row level security;
alter table public.referral_program_settings enable row level security;

drop policy if exists "Referrers and admins read referral attributions" on public.referral_attributions;
create policy "Referrers and admins read referral attributions"
  on public.referral_attributions for select to authenticated
  using (referrer_user_id = (select auth.uid()) or (select public.is_skill_up_admin()));

drop policy if exists "Referrers and admins read referral commissions" on public.referral_commissions;
create policy "Referrers and admins read referral commissions"
  on public.referral_commissions for select to authenticated
  using (referrer_user_id = (select auth.uid()) or (select public.is_skill_up_admin()));

revoke all on public.referral_attributions from anon, authenticated;
revoke all on public.referral_commissions from anon, authenticated;
revoke all on public.referral_program_settings from anon, authenticated;
grant select on public.referral_attributions, public.referral_commissions to authenticated;

create or replace function public.get_my_referral_summary()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'code', p.referral_code,
    'rate', s.commission_rate,
    'registrations', (
      select count(*)::integer
      from public.referral_attributions a
      where a.referrer_user_id = p.id
    ),
    'conversions', (
      select count(distinct c.referred_user_id)::integer
      from public.referral_commissions c
      where c.referrer_user_id = p.id and c.status = 'pending'
    ),
    'commission', coalesce((
      select sum(c.commission_amount)
      from public.referral_commissions c
      where c.referrer_user_id = p.id and c.status = 'pending'
    ), 0),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', 'Referred learner',
        'description', case when exists (
          select 1 from public.referral_commissions c
          where c.referrer_user_id = p.id
            and c.referred_user_id = a.referred_user_id
            and c.status = 'pending'
        ) then 'Registered · qualifying payment verified' else 'Registered using your referral link' end,
        'date', to_char(a.created_at at time zone 'UTC', 'YYYY-MM-DD'),
        'conversion', exists (
          select 1 from public.referral_commissions c
          where c.referrer_user_id = p.id
            and c.referred_user_id = a.referred_user_id
            and c.status = 'pending'
        )
      ) order by a.created_at desc)
      from (
        select referred_user_id, created_at
        from public.referral_attributions
        where referrer_user_id = p.id
        order by created_at desc
        limit 25
      ) a
    ), '[]'::jsonb)
  )
  from public.profiles p
  cross join public.referral_program_settings s
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
  if not (select public.is_skill_up_admin()) then
    raise exception 'Administrator access is required to record a verified referral conversion.';
  end if;
  if p_referred_user_id is null or nullif(btrim(p_course_id), '') is null
     or nullif(btrim(p_payment_id), '') is null or p_amount is null or p_amount <= 0 then
    raise exception 'A valid learner, course, payment reference, and positive verified amount are required.';
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

create or replace function public.reverse_referral_conversion(p_payment_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.is_skill_up_admin()) then
    raise exception 'Administrator access is required to reverse a referral conversion.';
  end if;
  update public.referral_commissions
  set status = 'reversed'
  where payment_id = btrim(coalesce(p_payment_id, ''))
    and status = 'pending';
  return found;
end;
$$;

create or replace function public.set_referral_commission_rate(p_rate numeric)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.is_skill_up_admin()) then
    raise exception 'Administrator access is required to update the referral commission rate.';
  end if;
  if p_rate is null or p_rate < 0 or p_rate > 100 then
    raise exception 'The referral commission rate must be between 0 and 100.';
  end if;
  update public.referral_program_settings
  set commission_rate = round(p_rate, 2), updated_at = now()
  where singleton = true;
  return round(p_rate, 2);
end;
$$;

create or replace function public.get_referral_admin_summary()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'name', p.full_name,
    'email', p.email,
    'code', p.referral_code,
    'rate', s.commission_rate,
    'referrals', coalesce(a.referrals, 0),
    'conversions', coalesce(c.conversions, 0),
    'commission', coalesce(c.commission, 0),
    'status', 'Active'
  ) order by coalesce(a.referrals, 0) desc, p.created_at desc), '[]'::jsonb)
  from public.profiles p
  cross join public.referral_program_settings s
  left join (
    select referrer_user_id, count(*)::integer as referrals
    from public.referral_attributions
    group by referrer_user_id
  ) a on a.referrer_user_id = p.id
  left join (
    select referrer_user_id,
      count(distinct referred_user_id)::integer as conversions,
      sum(commission_amount) as commission
    from public.referral_commissions
    where status = 'pending'
    group by referrer_user_id
  ) c on c.referrer_user_id = p.id
  where (select public.is_skill_up_admin()) and p.role in ('learner', 'user');
$$;

revoke all on function public.get_my_referral_summary() from public, anon;
revoke all on function public.record_referral_conversion(uuid, text, text, numeric) from public, anon, authenticated;
revoke all on function public.reverse_referral_conversion(text) from public, anon, authenticated;
revoke all on function public.set_referral_commission_rate(numeric) from public, anon, authenticated;
revoke all on function public.get_referral_admin_summary() from public, anon, authenticated;
grant execute on function public.get_my_referral_summary() to authenticated;
grant execute on function public.record_referral_conversion(uuid, text, text, numeric) to authenticated;
grant execute on function public.reverse_referral_conversion(text) to authenticated;
grant execute on function public.set_referral_commission_rate(numeric) to authenticated;
grant execute on function public.get_referral_admin_summary() to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'referral_attributions'
    ) then
      execute 'alter publication supabase_realtime add table public.referral_attributions';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'referral_commissions'
    ) then
      execute 'alter publication supabase_realtime add table public.referral_commissions';
    end if;
  end if;
end
$$;
