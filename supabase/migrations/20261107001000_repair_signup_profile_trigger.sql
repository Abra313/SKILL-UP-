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
