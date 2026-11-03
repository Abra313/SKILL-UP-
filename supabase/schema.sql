create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role text not null default 'learner' check (role in ('learner', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists role text;

update public.profiles
set role = case when lower(coalesce(role, '')) = 'admin' then 'admin' else 'learner' end
where role is distinct from case when lower(coalesce(role, '')) = 'admin' then 'admin' else 'learner' end;

alter table public.profiles alter column role set default 'learner';
alter table public.profiles alter column role set not null;
alter table public.profiles drop constraint if exists profiles_role_check;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_role_allowed_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_allowed_check check (role in ('learner', 'admin'));
  end if;
end;
$$;

create table if not exists public.courses (
  id text primary key,
  status text not null default 'Draft',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.learner_workspaces (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id text not null references public.courses (id) on delete cascade,
  status text not null default 'Successful' check (status in ('Pending', 'Successful', 'Failed', 'Refunded')),
  purchased_at date not null default current_date,
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  receipt text not null default '',
  primary key (user_id, course_id)
);

create table if not exists public.enrollment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id text not null references public.courses (id) on delete cascade,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create unique index if not exists enrollment_requests_one_pending_per_course
  on public.enrollment_requests (user_id, course_id)
  where status = 'Pending';

create table if not exists public.admin_workspaces (
  id text primary key check (id = 'main'),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.public_content (
  id text primary key,
  kind text not null check (kind in ('homepage', 'faq', 'job', 'resource', 'testimonial', 'announcement')),
  status text not null default 'Draft' check (status in ('Published', 'Draft', 'Archived')),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant select on public.courses to anon, authenticated;
grant insert, update, delete on public.courses to authenticated;
grant select, insert, update, delete on public.learner_workspaces to authenticated;
grant select, insert, update, delete on public.enrollments to authenticated;
grant select, insert, update on public.enrollment_requests to authenticated;
grant select, insert, update, delete on public.admin_workspaces to authenticated;
grant select on public.public_content to anon, authenticated;
grant insert, update, delete on public.public_content to authenticated;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.learner_workspaces enable row level security;
alter table public.enrollments enable row level security;
alter table public.enrollment_requests enable row level security;
alter table public.admin_workspaces enable row level security;
alter table public.public_content enable row level security;

drop policy if exists "profiles_read_self_or_admin" on public.profiles;
create policy "profiles_read_self_or_admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "profiles_update_own_name" on public.profiles;
create policy "profiles_update_own_name" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "courses_read_published_or_admin" on public.courses;
create policy "courses_read_published_or_admin" on public.courses
  for select to anon, authenticated
  using (status = 'Published' or (select public.is_admin()));

drop policy if exists "courses_admin_insert" on public.courses;
create policy "courses_admin_insert" on public.courses
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "courses_admin_update" on public.courses;
create policy "courses_admin_update" on public.courses
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "courses_admin_delete" on public.courses;
create policy "courses_admin_delete" on public.courses
  for delete to authenticated
  using ((select public.is_admin()));

drop policy if exists "learner_workspace_owner_or_admin" on public.learner_workspaces;
create policy "learner_workspace_owner_or_admin" on public.learner_workspaces
  for all to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "enrollments_read_owner_or_admin" on public.enrollments;
create policy "enrollments_read_owner_or_admin" on public.enrollments
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "enrollments_admin_write" on public.enrollments;
create policy "enrollments_admin_write" on public.enrollments
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "enrollment_requests_read_owner_or_admin" on public.enrollment_requests;
create policy "enrollment_requests_read_owner_or_admin" on public.enrollment_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "enrollment_requests_create_own" on public.enrollment_requests;
create policy "enrollment_requests_create_own" on public.enrollment_requests
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'Pending'
    and exists (
      select 1 from public.courses
      where id = course_id and status = 'Published'
    )
  );

drop policy if exists "enrollment_requests_admin_update" on public.enrollment_requests;
create policy "enrollment_requests_admin_update" on public.enrollment_requests
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create or replace function public.approve_enrollment_request(request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.enrollment_requests%rowtype;
  course_row public.courses%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can approve enrollment requests';
  end if;

  select * into request_row
  from public.enrollment_requests
  where id = request_id and status = 'Pending'
  for update;
  if not found then
    return false;
  end if;

  select * into course_row
  from public.courses
  where id = request_row.course_id;
  if not found then
    raise exception 'The requested course no longer exists';
  end if;

  insert into public.enrollments (user_id, course_id, status, purchased_at, amount, receipt)
  values (
    request_row.user_id,
    request_row.course_id,
    'Successful',
    current_date,
    greatest(coalesce(nullif(course_row.data ->> 'price', '')::numeric, 0), 0),
    'MANUAL-' || left(request_row.id::text, 8)
  )
  on conflict (user_id, course_id) do update
    set status = excluded.status,
        purchased_at = excluded.purchased_at,
        amount = excluded.amount,
        receipt = excluded.receipt;

  update public.enrollment_requests
  set status = 'Approved', reviewed_at = now()
  where id = request_row.id;
  return true;
end;
$$;

revoke all on function public.approve_enrollment_request(uuid) from public, anon, authenticated;
grant execute on function public.approve_enrollment_request(uuid) to authenticated;

drop policy if exists "admin_workspace_admin_only" on public.admin_workspaces;
create policy "admin_workspace_admin_only" on public.admin_workspaces
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "published_content_read_public" on public.public_content;
create policy "published_content_read_public" on public.public_content
  for select to anon, authenticated
  using (status = 'Published' or (select public.is_admin()));

drop policy if exists "published_content_admin_write" on public.public_content;
create policy "published_content_admin_write" on public.public_content
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, email, full_name)
select
  id,
  lower(email),
  coalesce(raw_user_meta_data ->> 'full_name', '')
from auth.users
where email is not null
on conflict (id) do update
  set email = excluded.email;
