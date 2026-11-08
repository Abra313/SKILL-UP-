drop policy if exists "Authenticated users read referral rate" on public.referral_program_settings;
create policy "Authenticated users read referral rate"
  on public.referral_program_settings for select to authenticated
  using (true);

grant select on public.referral_program_settings to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'referral_program_settings'
     ) then
    execute 'alter publication supabase_realtime add table public.referral_program_settings';
  end if;
end
$$;
