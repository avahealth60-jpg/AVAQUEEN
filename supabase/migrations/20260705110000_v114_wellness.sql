-- 20260705110000_v114_wellness.sql
-- Fase B: program wellness (edukatif, non-SaMD).
--
-- Program itu sendiri adalah DATA terkurasi di @ava/domain (WELLNESS_CATALOG),
-- jadi tabel di sini hanya menyimpan KETERLIBATAN pengguna:
--   • wellness_enrollments — program yang diikuti pengguna.
--   • wellness_checkins    — catatan harian manual (hidrasi, kebiasaan) untuk
--                            metrik yang TIDAK otomatis terlacak dari reading.
-- Metrik otomatis (langkah/tidur/menit aktif) diturunkan dari health_readings.
--
-- Semua data milik pengguna dan dilindungi RLS (pola sama: pemilik-saja).

create table if not exists wellness_enrollments (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references profiles(id) on delete cascade,
  program_code text not null,                 -- kode di WELLNESS_CATALOG (@ava/domain)
  status       text not null default 'active' check (status in ('active','completed','left')),
  target_days  int not null default 30 check (target_days > 0),
  started_at   date not null default current_date,
  created_at   timestamptz not null default now(),
  unique (customer_id, program_code)
);

create index if not exists idx_wellness_enrollments_customer on wellness_enrollments(customer_id);

create table if not exists wellness_checkins (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references profiles(id) on delete cascade,
  program_code text not null,
  day          date not null default current_date,
  metric       text not null,                 -- mis. 'hydration_ml', 'checkin'
  value        numeric not null check (value >= 0),
  created_at   timestamptz not null default now(),
  unique (customer_id, program_code, day)
);

create index if not exists idx_wellness_checkins_customer on wellness_checkins(customer_id);

alter table wellness_enrollments enable row level security;
alter table wellness_checkins    enable row level security;

-- Pemilik mengelola keikutsertaan & check-in-nya sendiri.
drop policy if exists "customer manages own enrollments" on wellness_enrollments;
create policy "customer manages own enrollments" on wellness_enrollments
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

drop policy if exists "customer manages own checkins" on wellness_checkins;
create policy "customer manages own checkins" on wellness_checkins
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- Admin AVA boleh membaca (analitik kurasi program; bukan data klinis).
drop policy if exists "admin reads enrollments" on wellness_enrollments;
create policy "admin reads enrollments" on wellness_enrollments
  for select using (app.is_admin());
drop policy if exists "admin reads checkins" on wellness_checkins;
create policy "admin reads checkins" on wellness_checkins
  for select using (app.is_admin());

grant select, insert, update, delete on wellness_enrollments to authenticated;
grant select, insert, update, delete on wellness_checkins to authenticated;
