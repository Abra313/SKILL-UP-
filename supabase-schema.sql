create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'learner',
  created_at timestamptz not null default now()
);

alter table public.profiles
  drop constraint if exists profiles_role_check;

update public.profiles
set role = 'learner'
where role = 'user';

alter table public.profiles
  alter column role set default 'learner',
  add constraint profiles_role_check check (role in ('learner', 'admin'));

create table if not exists public.app_workspaces (
  workspace_key text primary key,
  owner_id uuid references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.is_skill_up_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.create_skill_up_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'learner'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = case
          when excluded.full_name = '' then public.profiles.full_name
          else excluded.full_name
        end;
  return new;
end;
$$;

-- Remove the obsolete trigger that writes to display_name and user_roles.
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created_skill_up on auth.users;
create trigger on_auth_user_created_skill_up
  after insert on auth.users
  for each row execute function public.create_skill_up_profile();

insert into public.profiles (id, email, full_name)
select
  id,
  coalesce(email, ''),
  coalesce(raw_user_meta_data ->> 'full_name', '')
from auth.users
on conflict (id) do update
  set email = excluded.email,
      full_name = case
        when excluded.full_name = '' then public.profiles.full_name
        else excluded.full_name
      end;

alter table public.profiles enable row level security;
alter table public.app_workspaces enable row level security;

drop policy if exists "Users read own profile and admins read all" on public.profiles;
create policy "Users read own profile and admins read all"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id or (select public.is_skill_up_admin()));

drop policy if exists "Admins update profiles" on public.profiles;
create policy "Admins update profiles"
  on public.profiles for update to authenticated
  using ((select public.is_skill_up_admin()) or (select auth.uid()) = id)
  with check ((select public.is_skill_up_admin()) or (select auth.uid()) = id);

drop policy if exists "Read public workspace or authorized workspaces" on public.app_workspaces;
create policy "Read public workspace or authorized workspaces"
  on public.app_workspaces for select
  using (
    workspace_key = 'public'
    or (select public.is_skill_up_admin())
    or (
      (select auth.uid()) is not null
      and owner_id = (select auth.uid())
      and workspace_key = 'learner:' || (select auth.uid())::text
    )
  );

drop policy if exists "Admins publish and users save their workspace" on public.app_workspaces;
create policy "Admins publish and users save their workspace"
  on public.app_workspaces for insert to authenticated
  with check (
    (select public.is_skill_up_admin())
    or (
      owner_id = (select auth.uid())
      and workspace_key = 'learner:' || (select auth.uid())::text
    )
  );

drop policy if exists "Admins update and users update their workspace" on public.app_workspaces;
create policy "Admins update and users update their workspace"
  on public.app_workspaces for update to authenticated
  using (
    (select public.is_skill_up_admin())
    or (
      owner_id = (select auth.uid())
      and workspace_key = 'learner:' || (select auth.uid())::text
    )
  )
  with check (
    (select public.is_skill_up_admin())
    or (
      owner_id = (select auth.uid())
      and workspace_key = 'learner:' || (select auth.uid())::text
    )
  );

grant select on public.app_workspaces to anon, authenticated;
grant insert, update on public.app_workspaces to authenticated;
grant select on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- Promote a registered account to admin in the SQL editor; never put service-role keys in browser code.
-- update public.profiles set role = 'admin' where lower(email) = lower('admin@example.com') returning id, email, role;
