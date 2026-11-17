insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-videos',
  'course-videos',
  false,
  26214400,
  array['application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_access_course_material(p_course_id text)
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
      where workspace.workspace_key = 'learner:' || (select auth.uid())::text
        and (
          exists (
            select 1
            from jsonb_array_elements(
              case
                when jsonb_typeof(workspace.data->'enrollments') = 'array'
                  then workspace.data->'enrollments'
                else '[]'::jsonb
              end
            ) as enrollments(item)
            where item->>'courseId' = p_course_id
              and item->>'status' = 'Active'
          )
          or exists (
            select 1
            from jsonb_array_elements(
              case
                when jsonb_typeof(workspace.data->'purchases') = 'array'
                  then workspace.data->'purchases'
                else '[]'::jsonb
              end
            ) as purchases(item)
            where item->>'courseId' = p_course_id
              and item->>'status' = 'Successful'
          )
        )
    );
$$;

revoke all on function public.can_access_course_material(text) from public, anon;
grant execute on function public.can_access_course_material(text) to authenticated;

drop policy if exists "Admins manage private course videos" on storage.objects;
create policy "Admins manage private course videos"
  on storage.objects for all to authenticated
  using (bucket_id = 'course-videos' and (select public.is_skill_up_admin()))
  with check (bucket_id = 'course-videos' and (select public.is_skill_up_admin()));

drop policy if exists "Enrolled learners read course videos" on storage.objects;
create policy "Enrolled learners read course videos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'course-videos'
    and (select public.can_access_course_material(split_part(name, '/', 1)))
  );
