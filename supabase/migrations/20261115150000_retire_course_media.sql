drop policy if exists "Admins manage private course videos" on storage.objects;

update public.app_workspaces
set data = jsonb_set(
  data,
  '{courses}',
  coalesce(
    (
      select jsonb_agg(
        case
          when jsonb_typeof(course) = 'object'
            then course - 'moduleMaterials' - 'moduleResources'
          else course
        end
        order by ordinal
      )
      from jsonb_array_elements(data->'courses') with ordinality as course_items(course, ordinal)
    ),
    '[]'::jsonb
  ),
  false
)
where workspace_key in ('admin', 'public')
  and jsonb_typeof(data->'courses') = 'array';
