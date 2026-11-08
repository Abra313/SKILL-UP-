create table if not exists public.user_privacy_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  product_email boolean not null default false,
  marketing_email boolean not null default false,
  sms_notifications boolean not null default false,
  whatsapp_notifications boolean not null default false,
  analytics_cookies boolean not null default false,
  third_party_sharing boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  request_type text not null check (request_type in ('data_export', 'account_deletion', 'correction', 'restriction', 'privacy_concern')),
  details text not null default '',
  status text not null default 'Pending' check (status in ('Pending', 'In review', 'Completed', 'Declined')),
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists privacy_requests_user_created_idx
  on public.privacy_requests (user_id, created_at desc);
create index if not exists privacy_requests_status_created_idx
  on public.privacy_requests (status, created_at desc);

alter table public.user_privacy_preferences enable row level security;
alter table public.privacy_requests enable row level security;

drop policy if exists "Users manage their own privacy preferences" on public.user_privacy_preferences;
create policy "Users manage their own privacy preferences"
  on public.user_privacy_preferences for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users read their own privacy requests" on public.privacy_requests;
create policy "Users read their own privacy requests"
  on public.privacy_requests for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users create their own privacy requests" on public.privacy_requests;
create policy "Users create their own privacy requests"
  on public.privacy_requests for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'Pending'
    and admin_notes = ''
  );

drop policy if exists "Admins manage privacy requests" on public.privacy_requests;
create policy "Admins manage privacy requests"
  on public.privacy_requests for all to authenticated
  using ((select public.is_skill_up_admin()))
  with check ((select public.is_skill_up_admin()));

revoke all on public.user_privacy_preferences from anon, authenticated;
revoke all on public.privacy_requests from anon, authenticated;
grant select, insert, update on public.user_privacy_preferences to authenticated;
grant select, insert on public.privacy_requests to authenticated;
grant update on public.privacy_requests to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'user_privacy_preferences'
    ) then
      execute 'alter publication supabase_realtime add table public.user_privacy_preferences';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'privacy_requests'
    ) then
      execute 'alter publication supabase_realtime add table public.privacy_requests';
    end if;
  end if;
end
$$;
