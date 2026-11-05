drop policy if exists "Admins update profiles" on public.profiles;
create policy "Admins update profiles"
  on public.profiles for update to authenticated
  using ((select public.is_skill_up_admin()) or (select auth.uid()) = id)
  with check ((select public.is_skill_up_admin()) or (select auth.uid()) = id);

revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;
