-- 0009_consultations_commerce.sql
-- Melengkapi alur konsultasi: tarif, komisi AVA, dan direktori dokter.

-- 1) Tarif konsultasi (default; bisa dikonfigurasi per dokter di masa depan).
alter table consultations
  add column if not exists fee numeric not null default 50000;

-- 2) Komisi = potongan AVA per konsultasi yang SELESAI.
create table if not exists commissions (
  id                uuid primary key default gen_random_uuid(),
  consultation_id   uuid not null unique references consultations(id),
  doctor_id         uuid not null references profiles(id),
  gross_amount      numeric not null,         -- tarif konsultasi
  rate              numeric not null,          -- porsi AVA
  commission_amount numeric not null,          -- pendapatan AVA
  created_at        timestamptz not null default now()
);

alter table commissions enable row level security;
create policy "doctor reads own commissions" on commissions
  for select using (doctor_id = auth.uid());
create policy "admin reads commissions" on commissions
  for select using (app.is_admin());

-- 3) Trigger: catat komisi saat status berubah menjadi 'completed' (sekali).
create or replace function app.record_commission()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
declare r numeric := 0.15;  -- porsi AVA 15%
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    insert into commissions(consultation_id, doctor_id, gross_amount, rate, commission_amount)
    values (new.id, new.doctor_id, new.fee, r, round(new.fee * r))
    on conflict (consultation_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_record_commission on consultations;
create trigger trg_record_commission
  after update on consultations
  for each row execute function app.record_commission();

-- 4) Direktori dokter: pengguna terautentikasi boleh melihat profil dokter
--    (nama + id) agar masyarakat dapat memilih dokter saat booking.
create policy "authenticated reads doctor profiles" on profiles
  for select using (role = 'doctor');

-- 5) Dokter boleh melihat profil pasien yang berkonsultasi dengannya (nama).
create policy "doctor reads own patients" on profiles
  for select using (
    exists (
      select 1 from consultations c
      where c.doctor_id = auth.uid() and c.customer_id = profiles.id
    )
  );

grant select, insert, update, delete on commissions to authenticated;
