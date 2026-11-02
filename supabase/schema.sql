create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role text not null default 'learner' check (role in ('learner', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.admin_workspaces (
  id text primary key check (id = 'main'),
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
grant select, insert, update, delete on public.admin_workspaces to authenticated;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.learner_workspaces enable row level security;
alter table public.enrollments enable row level security;
alter table public.admin_workspaces enable row level security;

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

drop policy if exists "admin_workspace_admin_only" on public.admin_workspaces;
create policy "admin_workspace_admin_only" on public.admin_workspaces
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
