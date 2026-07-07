-- 20260705230000_v126_doctor_verification.sql
-- Verifikasi dokter (trust layer): dokter mengisi STR/SIP; ADMIN memverifikasi.
-- Dokter TIDAK bisa memverifikasi dirinya sendiri (guard di trigger profil).
alter table profiles add column if not exists str_no text;
alter table profiles add column if not exists sip_no text;
alter table profiles add column if not exists doctor_status text
  check (doctor_status in ('pending','verified','rejected')) default 'pending';

-- Perbarui pagar update profil: non-admin tak bisa ubah role, id, ATAU doctor_status.
create or replace function app.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public, app as $$
begin
  if new.id is distinct from old.id then
    new.id := old.id;
  end if;
  -- service_role = backend tepercaya (app admin) → dilewatkan.
  if new.role is distinct from old.role
     and not app.is_admin() and coalesce(auth.role(), '') <> 'service_role' then
    new.role := old.role;
  end if;
  if new.doctor_status is distinct from old.doctor_status
     and not app.is_admin() and coalesce(auth.role(), '') <> 'service_role' then
    new.doctor_status := old.doctor_status;      -- hanya admin yang memverifikasi
  end if;
  return new;
end;
$$;

-- Admin memverifikasi/menolak dokter (SECURITY DEFINER; cek is_admin).
create or replace function public.set_doctor_verification(p_doctor uuid, p_status text)
returns boolean language plpgsql security definer set search_path = public, app as $$
begin
  if not (app.is_admin() or coalesce(auth.role(), '') = 'service_role') then return false; end if;
  if p_status not in ('pending','verified','rejected') then return false; end if;
  update public.profiles set doctor_status = p_status where id = p_doctor and role = 'doctor';
  return found;
end;
$$;

grant execute on function public.set_doctor_verification(uuid, text) to authenticated;
