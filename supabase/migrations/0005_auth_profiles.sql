-- 0005_auth_profiles.sql
-- Saat user baru terbentuk di Supabase Auth (auth.users), buat baris profiles
-- otomatis. Role default 'customer'; admin/vendor/lab dipromosikan manual atau
-- lewat alur onboarding. Inilah yang membuat auth.uid() punya pasangan profil,
-- sehingga app.current_role() (dibaca RLS) mengembalikan peran yang benar.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    'customer',
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
