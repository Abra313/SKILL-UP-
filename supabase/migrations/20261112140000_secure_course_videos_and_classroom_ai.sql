insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-videos',
  'course-videos',
  false,
  536870912,
  array['video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins manage private course videos" on storage.objects;
create policy "Admins manage private course videos"
  on storage.objects for all to authenticated
  using (bucket_id = 'course-videos' and (select public.is_skill_up_admin()))
  with check (bucket_id = 'course-videos' and (select public.is_skill_up_admin()));

create table if not exists public.classroom_ai_usage (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0)
);

alter table public.classroom_ai_usage enable row level security;
revoke all on table public.classroom_ai_usage from public, anon, authenticated;
grant all on table public.classroom_ai_usage to service_role;

create or replace function public.consume_classroom_ai_request(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_request_count integer;
begin
  insert into public.classroom_ai_usage (user_id, window_started_at, request_count)
  values (p_user_id, now(), 1)
  on conflict (user_id) do update
    set window_started_at = case
          when public.classroom_ai_usage.window_started_at <= now() - interval '1 hour' then now()
          else public.classroom_ai_usage.window_started_at
        end,
        request_count = case
          when public.classroom_ai_usage.window_started_at <= now() - interval '1 hour' then 1
          else public.classroom_ai_usage.request_count + 1
        end
  returning request_count into current_request_count;

  return current_request_count <= 20;
end;
$$;

revoke all on function public.consume_classroom_ai_request(uuid) from public, anon, authenticated;
grant execute on function public.consume_classroom_ai_request(uuid) to service_role;
