-- 20260705160000_v119_customer_profile.sql
-- Profil medis customer (untuk personalisasi & auto-isi kalkulator) +
-- PERBAIKAN KEAMANAN eskalasi peran.
--
-- Bug: kebijakan "self can update own profile" (0003) mengizinkan pengguna
-- meng-update SELURUH kolom barisnya sendiri — termasuk `role`. Artinya seorang
-- customer bisa `update profiles set role='ava_admin'` dan naik jadi admin.
-- Perbaikan: trigger yang MEMBATALKAN perubahan `role` oleh non-admin (admin
-- tetap boleh mengubah peran). RLS tetap sama; trigger jadi pagar terakhir.

alter table profiles add column if not exists birth_date date;
alter table profiles add column if not exists sex text check (sex in ('pria','wanita'));
alter table profiles add column if not exists height_cm numeric check (height_cm > 0);
alter table profiles add column if not exists weight_kg numeric check (weight_kg > 0);

-- Pagar anti-eskalasi: non-admin tak bisa mengubah role/ id via update.
create or replace function app.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public, app as $$
begin
  if new.id is distinct from old.id then
    new.id := old.id;                       -- id tidak boleh berubah
  end if;
  if new.role is distinct from old.role and not app.is_admin() then
    new.role := old.role;                   -- hanya admin boleh ubah peran
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_update on profiles;
create trigger trg_guard_profile_update
  before update on profiles
  for each row execute function app.guard_profile_update();

-- Hak penghapusan (UU PDP): hapus SEMUA data pengguna dalam urutan aman-FK.
-- SECURITY DEFINER agar melewati RLS & RESTRICT FK. Catatan: baris auth.users
-- (kredensial login) dihapus terpisah via Admin API/service role.
create or replace function public.delete_my_account()
returns boolean language plpgsql security definer set search_path = public, app as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return false; end if;

  delete from analysis_results a
   using health_readings r where a.reading_id = r.id and r.customer_id = uid;
  delete from health_readings where customer_id = uid;

  delete from order_items oi using orders o where oi.order_id = o.id and o.customer_id = uid;
  delete from orders where customer_id = uid;
  delete from payments where customer_id = uid;

  delete from wellness_checkins where customer_id = uid;
  delete from wellness_enrollments where customer_id = uid;
  delete from employer_enrollments where customer_id = uid;
  delete from wearable_connections where customer_id = uid;
  delete from caregiver_links where patient_id = uid or caregiver_id = uid;
  delete from subscriptions where customer_id = uid;

  delete from commissions c using consultations k
   where c.consultation_id = k.id and k.customer_id = uid;
  delete from consultations where customer_id = uid;

  delete from notifications where recipient_id = uid;
  delete from consents where customer_id = uid;
  delete from profiles where id = uid;
  return true;
end;
$$;

grant execute on function public.delete_my_account() to authenticated;
