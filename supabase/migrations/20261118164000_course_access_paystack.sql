create table if not exists public.course_access (
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id text not null,
  source text not null check (source in ('paystack', 'manual', 'legacy')),
  payment_reference text,
  amount_kobo integer,
  status text not null default 'active' check (status in ('active', 'revoked')),
  granted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table if not exists public.course_payments (
  reference text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id text not null,
  amount_kobo integer not null check (amount_kobo = 500000),
  currency text not null check (currency = 'NGN'),
  status text not null check (status in ('pending', 'successful', 'failed', 'refunded')),
  channel text,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

alter table public.course_access enable row level security;
alter table public.course_payments enable row level security;

drop policy if exists "Learners read own course access and admins read all" on public.course_access;
create policy "Learners read own course access and admins read all"
  on public.course_access for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_skill_up_admin()));

drop policy if exists "Admins manage course access" on public.course_access;
create policy "Admins manage course access"
  on public.course_access for all to authenticated
  using ((select public.is_skill_up_admin()))
  with check ((select public.is_skill_up_admin()));

drop policy if exists "Learners read own course payments and admins read all" on public.course_payments;
create policy "Learners read own course payments and admins read all"
  on public.course_payments for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_skill_up_admin()));

drop policy if exists "Admins update course payment status" on public.course_payments;
create policy "Admins update course payment status"
  on public.course_payments for update to authenticated
  using ((select public.is_skill_up_admin()))
  with check ((select public.is_skill_up_admin()));

grant select, insert, update on public.course_access to authenticated;
grant select, update on public.course_payments to authenticated;
grant all on public.course_access, public.course_payments to service_role;

drop policy if exists "Enrolled learners read course videos" on storage.objects;
drop function if exists public.can_access_course_material(text);

with legacy_access as (
  select
    case
      when payment.item->>'userId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (payment.item->>'userId')::uuid
      when payment.item->>'studentId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (payment.item->>'studentId')::uuid
      else null
    end as user_id,
    payment.item->>'courseId' as course_id
  from public.app_workspaces as workspace
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(workspace.data->'payments') = 'array'
        then workspace.data->'payments'
      else '[]'::jsonb
    end
  ) as payment(item)
  where workspace.workspace_key = 'admin'
    and payment.item->>'status' = 'Successful'
    and nullif(payment.item->>'courseId', '') is not null
),
deduplicated_access as (
  select distinct user_id, course_id
  from legacy_access
  where user_id is not null
)
insert into public.course_access (user_id, course_id, source, status)
select user_id, course_id, 'legacy', 'active'
from deduplicated_access
on conflict (user_id, course_id) do nothing;

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
        )
    );
$$;

revoke all on function public.can_access_course_material(text, text) from public, anon;
grant execute on function public.can_access_course_material(text, text) to authenticated;

drop policy if exists "Enrolled learners read course videos" on storage.objects;
create policy "Learners read free previews and unlocked course materials"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'course-videos'
    and (select public.can_access_course_material(split_part(name, '/', 1), name))
  );
