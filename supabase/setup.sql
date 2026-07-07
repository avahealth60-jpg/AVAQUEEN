-- ============================================================================
-- AVA Health — SETUP DB LENGKAP (semua migrasi 0001–v125, berurutan)
-- Cara pakai: Supabase Dashboard → SQL Editor → tempel SELURUH file → Run.
-- Idempoten. Lalu jalankan check.sql. Digenerate dari supabase/migrations/.
-- ============================================================================

-- ┌── migrations/0001_enums.sql
-- 0001_enums.sql
-- Tipe enum inti. Dicocokkan 1:1 dengan packages/domain/src/types.ts.

do $$ begin
  create type user_role     as enum ('customer','doctor','faskes_admin','vendor','lab','ava_admin');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type qc_result     as enum ('lulus','perlu_tinjau','gagal');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type triage_level  as enum ('normal','perhatian','segera');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type consent_status as enum ('granted','withdrawn');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type consultation_status as enum ('requested','confirmed','completed','cancelled');
exception when duplicate_object then null;
end $$;


-- ┌── migrations/0002_core_tables.sql
-- 0002_core_tables.sql
-- Tabel inti + fungsi helper untuk RLS.
-- Asumsi lingkungan Supabase: schema `auth`, fungsi `auth.uid()`, dan role
-- `anon`/`authenticated`/`service_role` sudah disediakan platform.
-- (Untuk pengujian lokal, harness menyuntikkan stub yang setara — lihat supabase/tests.)

create schema if not exists app;

-- Profil pengguna; sumber kebenaran PERAN aplikasi.
create table if not exists profiles (
  id          uuid primary key,                 -- = auth.users.id
  role        user_role not null default 'customer',
  full_name   text,
  created_at  timestamptz not null default now()
);

-- Organisasi mitra (faskes, vendor, lab).
create table if not exists organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  kind        text not null check (kind in ('faskes','vendor','lab')),
  created_at  timestamptz not null default now()
);

-- Keanggotaan pengguna pada organisasi (mis. petugas vendor / lab).
create table if not exists organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id      uuid not null references profiles(id) on delete cascade,
  primary key (organization_id, profile_id)
);

-- ---------- Helper: peran & keanggotaan (SECURITY DEFINER agar lewati RLS) ----------
create or replace function app.current_role()
returns user_role language sql stable security definer set search_path = public, app as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function app.is_member_of(org uuid)
returns boolean language sql stable security definer set search_path = public, app as $$
  select exists (
    select 1 from public.organization_members
    where profile_id = auth.uid() and organization_id = org
  );
$$;

create or replace function app.is_admin()
returns boolean language sql stable security definer set search_path = public, app as $$
  select app.current_role() = 'ava_admin';
$$;

-- ---------- QC engine (wedge) ----------
create table if not exists device_models (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text,
  manufacturer text,
  nie_no      text,                              -- izin edar / NIE (Permenkes 62/2017)
  calibration_interval_months int not null default 12 check (calibration_interval_months > 0)
);

create table if not exists devices (
  id          uuid primary key default gen_random_uuid(),
  model_id    uuid not null references device_models(id),
  serial      text unique not null,
  vendor_id   uuid not null references organizations(id),
  status      text not null default 'registered',
  registered_at timestamptz not null default now()
);

create table if not exists calibrations (
  id           uuid primary key default gen_random_uuid(),
  device_id    uuid not null references devices(id),
  lab_id       uuid not null references organizations(id),
  performed_at date not null,
  next_due_at  date not null,
  certificate_url text,
  performed_by text,
  created_at   timestamptz not null default now()
);

create table if not exists qc_results (
  id              uuid primary key default gen_random_uuid(),
  calibration_id  uuid not null references calibrations(id),
  result          qc_result not null,
  metrics         jsonb,
  notes           text,
  created_at      timestamptz not null default now()
);

create table if not exists badges (
  id              uuid primary key default gen_random_uuid(),
  device_id       uuid not null references devices(id),
  calibration_id  uuid not null references calibrations(id),
  status          text not null default 'active',
  issued_at       timestamptz not null default now(),
  expires_at      date not null
);

-- ---------- Hasil kesehatan & AI (posisi edukatif dikunci di skema) ----------
create table if not exists health_readings (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references profiles(id),
  reading_type text not null,
  value        jsonb not null,
  unit         text,
  taken_at     timestamptz not null default now(),
  source       text not null default 'manual'
);

create table if not exists analysis_results (
  id            uuid primary key default gen_random_uuid(),
  reading_id    uuid not null references health_readings(id),
  triage        triage_level not null,
  explanation   text,
  -- INVARIANT SaMD: output AI tidak pernah diagnosis.
  is_educational boolean not null default true check (is_educational = true),
  disclaimer    text not null check (length(disclaimer) > 0),
  model_meta    jsonb,
  created_at    timestamptz not null default now()
);

-- ---------- Konsultasi ----------
create table if not exists consultations (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references profiles(id),
  doctor_id     uuid not null references profiles(id),
  status        consultation_status not null default 'requested',
  -- hasil yang DIBAGIKAN pasien untuk konsultasi ini (kontrol akses dokter)
  shared_reading_ids uuid[] not null default '{}',
  scheduled_at  timestamptz,
  join_url      text,
  created_at    timestamptz not null default now()
);

-- ---------- Kepatuhan UU PDP ----------
create table if not exists consents (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id),
  purpose     text not null,
  status      consent_status not null default 'granted',
  granted_at  timestamptz not null default now(),
  withdrawn_at timestamptz
);

create table if not exists audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid,
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  detail      jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id),
  channel     text not null,
  title       text,
  body        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index on devices(vendor_id);
create index on calibrations(device_id);
create index on health_readings(customer_id);
create index on consultations(doctor_id);
create index on consultations(customer_id);


-- ┌── migrations/0003_rls.sql
-- 0003_rls.sql
-- Row Level Security: jantung pemisahan tanggung jawab partnership.
-- Aturan: SEMUA tabel RLS-on, default DENY. Akses diberikan eksplisit per peran.

alter table profiles              enable row level security;
alter table organizations         enable row level security;
alter table organization_members  enable row level security;
alter table device_models         enable row level security;
alter table devices               enable row level security;
alter table calibrations          enable row level security;
alter table qc_results            enable row level security;
alter table badges                enable row level security;
alter table health_readings       enable row level security;
alter table analysis_results      enable row level security;
alter table consultations         enable row level security;
alter table consents              enable row level security;
alter table audit_logs            enable row level security;
alter table notifications         enable row level security;

-- ---------------- profiles ----------------
drop policy if exists "self can read own profile" on profiles;
create policy "self can read own profile" on profiles
  for select using (id = auth.uid());
drop policy if exists "self can update own profile" on profiles;
create policy "self can update own profile" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "admin reads all profiles" on profiles;
create policy "admin reads all profiles" on profiles
  for select using (app.is_admin());

-- ---------------- health_readings (data sensitif) ----------------
-- Masyarakat hanya akses hasilnya sendiri.
drop policy if exists "customer owns readings" on health_readings;
create policy "customer owns readings" on health_readings
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- Dokter hanya BACA hasil yang DIBAGIKAN dalam konsultasi yang ditugaskan padanya.
drop policy if exists "doctor reads shared readings" on health_readings;
create policy "doctor reads shared readings" on health_readings
  for select using (
    exists (
      select 1 from consultations c
      where c.doctor_id = auth.uid()
        and health_readings.id = any (c.shared_reading_ids)
    )
  );

-- ---------------- analysis_results ----------------
-- Mengikuti akses ke reading induknya: pemilik reading boleh baca.
drop policy if exists "customer reads own analysis" on analysis_results;
create policy "customer reads own analysis" on analysis_results
  for select using (
    exists (select 1 from health_readings r
            where r.id = analysis_results.reading_id and r.customer_id = auth.uid())
  );
drop policy if exists "doctor reads shared analysis" on analysis_results;
create policy "doctor reads shared analysis" on analysis_results
  for select using (
    exists (
      select 1 from consultations c
      where c.doctor_id = auth.uid()
        and analysis_results.reading_id = any (c.shared_reading_ids)
    )
  );

-- ---------------- consultations ----------------
drop policy if exists "customer sees own consultations" on consultations;
create policy "customer sees own consultations" on consultations
  for select using (customer_id = auth.uid());
drop policy if exists "customer creates consultation" on consultations;
create policy "customer creates consultation" on consultations
  for insert with check (customer_id = auth.uid());
drop policy if exists "customer updates own consultation" on consultations;
create policy "customer updates own consultation" on consultations
  for update using (customer_id = auth.uid()) with check (customer_id = auth.uid());
drop policy if exists "doctor sees assigned consultations" on consultations;
create policy "doctor sees assigned consultations" on consultations
  for select using (doctor_id = auth.uid());
drop policy if exists "doctor updates assigned consultation" on consultations;
create policy "doctor updates assigned consultation" on consultations
  for update using (doctor_id = auth.uid()) with check (doctor_id = auth.uid());

-- ---------------- devices (vendor isolation) ----------------
-- Vendor hanya melihat alat MILIK organisasinya.
drop policy if exists "vendor sees own devices" on devices;
create policy "vendor sees own devices" on devices
  for select using (app.is_member_of(vendor_id));
drop policy if exists "vendor registers own devices" on devices;
create policy "vendor registers own devices" on devices
  for insert with check (app.is_member_of(vendor_id));
-- Lab boleh melihat alat (untuk antrian kalibrasi).
drop policy if exists "lab reads devices" on devices;
create policy "lab reads devices" on devices
  for select using (app.current_role() = 'lab');
drop policy if exists "admin reads devices" on devices;
create policy "admin reads devices" on devices
  for select using (app.is_admin());

-- ---------------- device_models (referensi publik bagi pengguna terautentikasi) ----------------
drop policy if exists "authenticated reads models" on device_models;
create policy "authenticated reads models" on device_models
  for select using (auth.uid() is not null);

-- ---------------- calibrations ----------------
drop policy if exists "lab manages own calibrations" on calibrations;
create policy "lab manages own calibrations" on calibrations
  for all using (app.is_member_of(lab_id)) with check (app.is_member_of(lab_id));
drop policy if exists "vendor reads calibrations of own devices" on calibrations;
create policy "vendor reads calibrations of own devices" on calibrations
  for select using (
    exists (select 1 from devices d where d.id = calibrations.device_id and app.is_member_of(d.vendor_id))
  );
drop policy if exists "admin reads calibrations" on calibrations;
create policy "admin reads calibrations" on calibrations
  for select using (app.is_admin());

-- ---------------- qc_results ----------------
drop policy if exists "lab writes qc for own calibrations" on qc_results;
create policy "lab writes qc for own calibrations" on qc_results
  for all using (
    exists (select 1 from calibrations c where c.id = qc_results.calibration_id and app.is_member_of(c.lab_id))
  ) with check (
    exists (select 1 from calibrations c where c.id = qc_results.calibration_id and app.is_member_of(c.lab_id))
  );
drop policy if exists "admin reads qc" on qc_results;
create policy "admin reads qc" on qc_results
  for select using (app.is_admin());

-- ---------------- badges (publik terverifikasi) ----------------
-- Badge "AVA Verified" boleh dibaca siapa pun yang terautentikasi (cek kepercayaan alat).
drop policy if exists "authenticated reads badges" on badges;
create policy "authenticated reads badges" on badges
  for select using (auth.uid() is not null);
drop policy if exists "admin manages badges" on badges;
create policy "admin manages badges" on badges
  for all using (app.is_admin()) with check (app.is_admin());

-- ---------------- consents ----------------
drop policy if exists "customer manages own consents" on consents;
create policy "customer manages own consents" on consents
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());
drop policy if exists "admin reads consents" on consents;
create policy "admin reads consents" on consents
  for select using (app.is_admin());

-- ---------------- notifications ----------------
drop policy if exists "recipient reads own notifications" on notifications;
create policy "recipient reads own notifications" on notifications
  for select using (recipient_id = auth.uid());
drop policy if exists "recipient updates own notifications" on notifications;
create policy "recipient updates own notifications" on notifications
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- ---------------- audit_logs ----------------
-- Hanya admin yang membaca. Penulisan via trigger/service_role (bypass RLS).
drop policy if exists "admin reads audit" on audit_logs;
create policy "admin reads audit" on audit_logs
  for select using (app.is_admin());

-- ---------------- organizations / members ----------------
drop policy if exists "member reads own org" on organizations;
create policy "member reads own org" on organizations
  for select using (app.is_member_of(id) or app.is_admin());
drop policy if exists "member reads own membership" on organization_members;
create policy "member reads own membership" on organization_members
  for select using (profile_id = auth.uid() or app.is_admin());


-- ┌── migrations/0004_triggers_grants.sql
-- 0004_triggers_grants.sql
-- Trigger audit + grant privilege ke role authenticated (RLS tetap menyaring baris).

-- Audit otomatis untuk perubahan badge (akuntabilitas jangka panjang).
create or replace function app.audit_badge() returns trigger
language plpgsql security definer set search_path = public, app as $$
begin
  insert into audit_logs(actor_id, action, entity, entity_id, detail)
  values (auth.uid(), tg_op, 'badges', coalesce(new.id, old.id),
          jsonb_build_object('status', coalesce(new.status, old.status)));
  return coalesce(new, old);
end; $$;

drop trigger if exists trg_audit_badge on badges;
create trigger trg_audit_badge
  after insert or update or delete on badges
  for each row execute function app.audit_badge();

-- Trigger: set next_due_at otomatis bila tidak diisi (interval dari model).
create or replace function app.set_calibration_due() returns trigger
language plpgsql security definer set search_path = public, app as $$
declare months int;
begin
  if new.next_due_at is null then
    select dm.calibration_interval_months into months
    from devices d join device_models dm on dm.id = d.model_id
    where d.id = new.device_id;
    new.next_due_at := new.performed_at + (months || ' months')::interval;
  end if;
  return new;
end; $$;

drop trigger if exists trg_set_calibration_due on calibrations;
create trigger trg_set_calibration_due
  before insert on calibrations
  for each row execute function app.set_calibration_due();

-- Grants: authenticated boleh DML; RLS yang menentukan baris mana.
grant usage on schema public, app to authenticated, anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant execute on all functions in schema app to authenticated, anon;


-- ┌── migrations/0005_auth_profiles.sql
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


-- ┌── migrations/0006_badge_issuance.sql
-- 0006_badge_issuance.sql
-- Penerbitan badge sebagai AKSI SISTEM, bukan privilege pengguna.
-- Saat lab menyimpan QC 'lulus' (diizinkan RLS "lab writes qc for own
-- calibrations"), trigger SECURITY DEFINER ini menerbitkan badge — sehingga
-- lab tidak butuh hak tulis langsung ke tabel badges (tetap milik admin/sistem).
--
-- Konsisten dengan @ava/domain.decideBadge:
--   - hanya 'lulus' yang menerbitkan badge;
--   - masa berlaku = next_due_at kalibrasi (= performed_at + interval model).

create or replace function app.issue_badge_on_qc()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_device uuid;
  v_due    date;
begin
  if new.result = 'lulus' then
    select c.device_id, c.next_due_at
      into v_device, v_due
      from calibrations c
     where c.id = new.calibration_id;

    -- Nonaktifkan badge aktif lama untuk alat ini (satu badge aktif per alat).
    update badges set status = 'expired'
     where device_id = v_device and status = 'active';

    insert into badges(device_id, calibration_id, status, expires_at)
    values (v_device, new.calibration_id, 'active', v_due);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_issue_badge_on_qc on qc_results;
create trigger trg_issue_badge_on_qc
  after insert on qc_results
  for each row execute function app.issue_badge_on_qc();


-- ┌── migrations/0007_partner_policies.sql
-- 0007_partner_policies.sql
-- Vendor berhak melihat hasil QC alatnya sendiri (simetris dengan kebijakan
-- "vendor reads calibrations of own devices"). Tanpa ini, portal vendor hanya
-- bisa menampilkan status badge, bukan alasan lulus/gagal QC-nya.

drop policy if exists "vendor reads qc of own devices" on qc_results;
create policy "vendor reads qc of own devices" on qc_results
  for select using (
    exists (
      select 1
      from calibrations c
      join devices d on d.id = c.device_id
      where c.id = qc_results.calibration_id
        and app.is_member_of(d.vendor_id)
    )
  );


-- ┌── migrations/0008_analysis_write.sql
-- 0008_analysis_write.sql
-- Customer boleh menyimpan hasil analisis UNTUK reading miliknya sendiri.
-- Aman karena kepemilikan reading diverifikasi; invariant SaMD (is_educational,
-- disclaimer) tetap dijaga CHECK di tabel analysis_results.
-- Triase dihitung @ava/domain (deterministik, teruji) lalu disimpan lewat ini.

drop policy if exists "customer writes analysis for own readings" on analysis_results;
create policy "customer writes analysis for own readings" on analysis_results
  for insert with check (
    exists (
      select 1 from health_readings r
      where r.id = analysis_results.reading_id
        and r.customer_id = auth.uid()
    )
  );


-- ┌── migrations/0009_consultations_commerce.sql
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
drop policy if exists "doctor reads own commissions" on commissions;
create policy "doctor reads own commissions" on commissions
  for select using (doctor_id = auth.uid());
drop policy if exists "admin reads commissions" on commissions;
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
drop policy if exists "authenticated reads doctor profiles" on profiles;
create policy "authenticated reads doctor profiles" on profiles
  for select using (role = 'doctor');

-- 5) Dokter boleh melihat profil pasien yang berkonsultasi dengannya (nama).
drop policy if exists "doctor reads own patients" on profiles;
create policy "doctor reads own patients" on profiles
  for select using (
    exists (
      select 1 from consultations c
      where c.doctor_id = auth.uid() and c.customer_id = profiles.id
    )
  );

grant select, insert, update, delete on commissions to authenticated;


-- ┌── migrations/20260628093000_v111_pemeriksaan_katalog.sql
-- ============================================================================
-- AVA Health — Migrasi V1.1.1 : Mesin Pemeriksaan Multi-parameter & Katalog
-- ----------------------------------------------------------------------------
-- Idempoten by design: aman dijalankan ulang (preview branch, re-deploy).
--   * enum  : DO-guard (create hanya bila belum ada)
--   * tabel : create table if not exists
--   * index : create [unique] index if not exists
--   * policy: drop policy if exists  ->  create policy
--   * trigger: drop trigger if exists ->  create trigger
--   * fungsi: create or replace
-- Tidak ada perubahan manual ke produksi — semua lewat migrasi berversi.
-- ============================================================================

-- 1) Enum triase (sudah ada sejak V1.0; guard agar fresh DB tetap jalan) --------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'triage_level') then
    create type triage_level as enum ('normal', 'perhatian', 'segera');
  end if;
end $$;

-- 2) Katalog: panel ------------------------------------------------------------
create table if not exists panels (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  name        text not null,
  description text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 3) Katalog: parameter (DATA, bukan kode — parameter baru = baris baru) --------
create table if not exists parameters (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  name        text not null,
  unit        text,
  panel_id    uuid references panels(id) on delete set null,
  value_type  text not null default 'numeric',
  decimals    int not null default 0,
  loinc       text,                       -- diisi klinisi saat pemetaan FHIR resmi
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint parameters_value_type_chk check (value_type in ('numeric', 'integer'))
);
create index if not exists idx_parameters_panel on parameters(panel_id);

-- 4) Katalog: rentang rujukan (teraudit & ditandatangani klinisi) --------------
create table if not exists reference_ranges (
  id            uuid primary key default gen_random_uuid(),
  parameter_id  uuid not null references parameters(id) on delete cascade,
  cohort        text not null default 'umum',
  normal_min    numeric,
  normal_max    numeric,
  scale_min     numeric not null,
  scale_max     numeric not null,
  urgent_low    numeric,                   -- < ini => 'segera'
  urgent_high   numeric,                   -- > ini => 'segera'
  -- WAJIB untuk auditabilitas (Permenkes/PDP): sumber & sign-off klinisi
  source        text not null,
  signed_off_by text not null,
  signed_off_at date not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  constraint reference_ranges_scale_chk check (scale_max > scale_min),
  constraint reference_ranges_uniq unique (parameter_id, cohort)
);
create index if not exists idx_refrange_param on reference_ranges(parameter_id);

-- 5) Sesi pemeriksaan (checkup) -----------------------------------------------
create table if not exists checkups (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null references profiles(id) on delete cascade,
  taken_at       timestamptz not null default now(),
  source         text not null default 'manual',
  summary_triage triage_level,             -- roll-up otomatis dari nilai (trigger)
  note           text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_checkups_customer on checkups(customer_id, taken_at desc);

-- 6) Nilai per parameter dalam sesi -------------------------------------------
create table if not exists checkup_values (
  id                 uuid primary key default gen_random_uuid(),
  checkup_id         uuid not null references checkups(id) on delete cascade,
  parameter_id       uuid not null references parameters(id),
  value              numeric not null,
  unit               text,                 -- snapshot satuan saat input
  triage             triage_level,         -- hasil deterministik dari @ava/domain
  reference_range_id uuid references reference_ranges(id),  -- snapshot rentang dipakai
  created_at         timestamptz not null default now()
);
create index if not exists idx_checkup_values_checkup on checkup_values(checkup_id);

-- 7) Trigger: roll-up ringkasan sesi = triase TERBURUK dari nilainya ----------
--    Agregasi data murni (bukan logika klinis) — aman dihitung di DB.
create or replace function ava_recompute_checkup_summary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cid   uuid;
  worst triage_level;
begin
  cid := coalesce(new.checkup_id, old.checkup_id);
  select cv.triage into worst
  from checkup_values cv
  where cv.checkup_id = cid and cv.triage is not null
  order by case cv.triage
             when 'segera' then 3
             when 'perhatian' then 2
             else 1
           end desc
  limit 1;

  update checkups set summary_triage = worst where id = cid;
  return null;
end $$;

drop trigger if exists trg_checkup_values_summary on checkup_values;
create trigger trg_checkup_values_summary
  after insert or update or delete on checkup_values
  for each row execute function ava_recompute_checkup_summary();

-- 8) Row Level Security -------------------------------------------------------
alter table panels           enable row level security;
alter table parameters       enable row level security;
alter table reference_ranges enable row level security;
alter table checkups         enable row level security;
alter table checkup_values   enable row level security;

-- Katalog = data rujukan: dibaca semua user terautentikasi, ditulis admin saja.
drop policy if exists "katalog panels readable" on panels;
create policy "katalog panels readable" on panels
  for select using (true);
drop policy if exists "katalog panels admin write" on panels;
create policy "katalog panels admin write" on panels
  for all using (
    coalesce(
      (auth.jwt() ->> 'role'),
      (auth.jwt() -> 'app_metadata' ->> 'role')
    ) = 'ava_admin'
  )
  with check (
    coalesce(
      (auth.jwt() ->> 'role'),
      (auth.jwt() -> 'app_metadata' ->> 'role')
    ) = 'ava_admin'
  );

drop policy if exists "katalog parameters readable" on parameters;
create policy "katalog parameters readable" on parameters
  for select using (true);
drop policy if exists "katalog parameters admin write" on parameters;
create policy "katalog parameters admin write" on parameters
  for all using (
    coalesce(
      (auth.jwt() ->> 'role'),
      (auth.jwt() -> 'app_metadata' ->> 'role')
    ) = 'ava_admin'
  )
  with check (
    coalesce(
      (auth.jwt() ->> 'role'),
      (auth.jwt() -> 'app_metadata' ->> 'role')
    ) = 'ava_admin'
  );

drop policy if exists "katalog ranges readable" on reference_ranges;
create policy "katalog ranges readable" on reference_ranges
  for select using (true);
drop policy if exists "katalog ranges admin write" on reference_ranges;
create policy "katalog ranges admin write" on reference_ranges
  for all using (
    coalesce(
      (auth.jwt() ->> 'role'),
      (auth.jwt() -> 'app_metadata' ->> 'role')
    ) = 'ava_admin'
  )
  with check (
    coalesce(
      (auth.jwt() ->> 'role'),
      (auth.jwt() -> 'app_metadata' ->> 'role')
    ) = 'ava_admin'
  );

-- Masyarakat hanya pegang sesi & nilainya sendiri.
drop policy if exists "customer owns checkups" on checkups;
create policy "customer owns checkups" on checkups
  for all using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

drop policy if exists "customer owns checkup_values" on checkup_values;
create policy "customer owns checkup_values" on checkup_values
  for all using (
    exists (select 1 from checkups c where c.id = checkup_id and c.customer_id = auth.uid())
  )
  with check (
    exists (select 1 from checkups c where c.id = checkup_id and c.customer_id = auth.uid())
  );

-- ============================================================================
-- Catatan posisi SaMD: tabel ini menyimpan nilai & hasil triase DETERMINISTIK.
-- Tidak ada kolom "diagnosis". Penjelasan edukatif tetap di analysis_results
-- (is_educational=true + disclaimer) seperti V1.0 — tak tersentuh migrasi ini.
-- ============================================================================


-- ┌── migrations/20260628093001_v111_seed_katalog.sql
-- ============================================================================
-- AVA Health — Migrasi V1.1.1 : Seed Katalog Pemeriksaan
-- ----------------------------------------------------------------------------
-- Idempoten: semua INSERT memakai ON CONFLICT ... DO UPDATE (upsert).
--
-- PENTING (kejujuran medis): nilai rentang di bawah ini adalah CONTOH untuk
-- pengembangan. Sebelum produksi, setiap rentang WAJIB divalidasi & ditanda-
-- tangani klinisi berlisensi; ganti `signed_off_by` & `source` dengan acuan
-- resmi. Skema sengaja memaksa kolom sign-off agar ini tak terlewat.
-- ============================================================================

-- 1) Panel ---------------------------------------------------------------------
insert into panels (code, name, description, sort_order) values
  ('vital',        'Vital',         'Tekanan darah, nadi, SpO2, suhu, laju napas', 10),
  ('glikemik',     'Glikemik',      'Gula darah & HbA1c',                          20),
  ('lipid',        'Lipid',         'Kolesterol & trigliserida',                   30),
  ('antropometri', 'Antropometri',  'Berat, tinggi, BMI, lingkar pinggang',        40),
  ('lain',         'Lainnya',       'Asam urat, hemoglobin',                       50)
on conflict (code) do update
  set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

-- 2) Parameter -----------------------------------------------------------------
insert into parameters (code, name, unit, panel_id, value_type, decimals, sort_order) values
  ('td_sistolik',     'Tekanan darah sistolik',  'mmHg', (select id from panels where code='vital'),        'integer', 0, 10),
  ('td_diastolik',    'Tekanan darah diastolik', 'mmHg', (select id from panels where code='vital'),        'integer', 0, 20),
  ('nadi',            'Nadi',                    'bpm',  (select id from panels where code='vital'),        'integer', 0, 30),
  ('spo2',            'SpO2',                    '%',    (select id from panels where code='vital'),        'integer', 0, 40),
  ('suhu',            'Suhu tubuh',              '°C',   (select id from panels where code='vital'),        'numeric', 1, 50),
  ('laju_napas',      'Laju napas',              '/mnt', (select id from panels where code='vital'),        'integer', 0, 60),
  ('glukosa_puasa',   'Gula darah puasa',        'mg/dL',(select id from panels where code='glikemik'),     'integer', 0, 10),
  ('glukosa_sewaktu', 'Gula darah sewaktu',      'mg/dL',(select id from panels where code='glikemik'),     'integer', 0, 20),
  ('hba1c',           'HbA1c',                   '%',    (select id from panels where code='glikemik'),     'numeric', 1, 30),
  ('kolesterol_total','Kolesterol total',        'mg/dL',(select id from panels where code='lipid'),        'integer', 0, 10),
  ('ldl',             'LDL',                     'mg/dL',(select id from panels where code='lipid'),        'integer', 0, 20),
  ('hdl',             'HDL',                     'mg/dL',(select id from panels where code='lipid'),        'integer', 0, 30),
  ('trigliserida',    'Trigliserida',            'mg/dL',(select id from panels where code='lipid'),        'integer', 0, 40),
  ('berat',           'Berat badan',             'kg',   (select id from panels where code='antropometri'), 'numeric', 1, 10),
  ('tinggi',          'Tinggi badan',            'cm',   (select id from panels where code='antropometri'), 'numeric', 1, 20),
  ('bmi',             'BMI',                     null,   (select id from panels where code='antropometri'), 'numeric', 1, 30),
  ('lingkar_pinggang','Lingkar pinggang',        'cm',   (select id from panels where code='antropometri'), 'numeric', 1, 40),
  ('asam_urat',       'Asam urat',               'mg/dL',(select id from panels where code='lain'),         'numeric', 1, 10),
  ('hemoglobin',      'Hemoglobin',              'g/dL', (select id from panels where code='lain'),         'numeric', 1, 20)
on conflict (code) do update
  set name = excluded.name, unit = excluded.unit, panel_id = excluded.panel_id,
      value_type = excluded.value_type, decimals = excluded.decimals, sort_order = excluded.sort_order;

-- 3) Rentang rujukan (kohort 'umum', CONTOH — wajib di-sign klinisi) -----------
insert into reference_ranges
  (parameter_id, cohort, normal_min, normal_max, scale_min, scale_max, urgent_low, urgent_high, source, signed_off_by, signed_off_at)
values
  ((select id from parameters where code='glukosa_puasa'),   'umum',  70,   99,   50,  250,  54,  125, 'Seed V1.1.1 (contoh)', 'BELUM DITANDATANGANI — placeholder', '2026-06-28'),
  ((select id from parameters where code='glukosa_sewaktu'), 'umum',  70,  139,   50,  300,  54,  199, 'Seed V1.1.1 (contoh)', 'BELUM DITANDATANGANI — placeholder', '2026-06-28'),
  ((select id from parameters where code='hba1c'),           'umum', 4.0,  5.6,  3.0, 12.0, null, 6.5, 'Seed V1.1.1 (contoh)', 'BELUM DITANDATANGANI — placeholder', '2026-06-28'),
  ((select id from parameters where code='td_sistolik'),     'umum',  90,  119,   60,  220,  80,  180, 'Seed V1.1.1 (contoh)', 'BELUM DITANDATANGANI — placeholder', '2026-06-28'),
  ((select id from parameters where code='td_diastolik'),    'umum',  60,   79,   40,  140,  50,  120, 'Seed V1.1.1 (contoh)', 'BELUM DITANDATANGANI — placeholder', '2026-06-28'),
  ((select id from parameters where code='nadi'),            'umum',  60,  100,   30,  160,  40,  130, 'Seed V1.1.1 (contoh)', 'BELUM DITANDATANGANI — placeholder', '2026-06-28'),
  ((select id from parameters where code='spo2'),            'umum',  95,  100,   70,  100,  90, null, 'Seed V1.1.1 (contoh)', 'BELUM DITANDATANGANI — placeholder', '2026-06-28'),
  ((select id from parameters where code='suhu'),            'umum', 36.1, 37.2, 34.0, 42.0, 35.0, 39.0, 'Seed V1.1.1 (contoh)', 'BELUM DITANDATANGANI — placeholder', '2026-06-28'),
  ((select id from parameters where code='kolesterol_total'),'umum', 120,  199,  100,  320, null,  240, 'Seed V1.1.1 (contoh)', 'BELUM DITANDATANGANI — placeholder', '2026-06-28'),
  ((select id from parameters where code='ldl'),             'umum',  30,   99,    0,  220, null,  160, 'Seed V1.1.1 (contoh)', 'BELUM DITANDATANGANI — placeholder', '2026-06-28'),
  ((select id from parameters where code='hdl'),             'umum',  40,  100,    0,  120,  30, null, 'Seed V1.1.1 (contoh)', 'BELUM DITANDATANGANI — placeholder', '2026-06-28'),
  ((select id from parameters where code='trigliserida'),    'umum',  40,  149,    0,  600, null,  500, 'Seed V1.1.1 (contoh)', 'BELUM DITANDATANGANI — placeholder', '2026-06-28'),
  ((select id from parameters where code='bmi'),             'umum', 18.5, 24.9, 12.0, 45.0, 16.0, 35.0, 'Seed V1.1.1 (contoh)', 'BELUM DITANDATANGANI — placeholder', '2026-06-28'),
  ((select id from parameters where code='asam_urat'),       'umum', 3.4,  7.0,  1.0, 15.0, null, 10.0, 'Seed V1.1.1 (contoh)', 'BELUM DITANDATANGANI — placeholder', '2026-06-28'),
  ((select id from parameters where code='hemoglobin'),      'umum', 12.0, 16.0,  4.0, 20.0,  7.0, null, 'Seed V1.1.1 (contoh)', 'BELUM DITANDATANGANI — placeholder', '2026-06-28')
on conflict (parameter_id, cohort) do update
  set normal_min = excluded.normal_min, normal_max = excluded.normal_max,
      scale_min = excluded.scale_min, scale_max = excluded.scale_max,
      urgent_low = excluded.urgent_low, urgent_high = excluded.urgent_high,
      source = excluded.source, signed_off_by = excluded.signed_off_by, signed_off_at = excluded.signed_off_at;


-- ┌── migrations/20260628094000_v112_basis_pengetahuan.sql
-- ============================================================================
-- AVA Health — Migrasi V1.1.2 : Basis Pengetahuan Terkurasi
-- ----------------------------------------------------------------------------
-- knowledge_entries: konten edukatif (artinya/penyebab/saran/kapan ke dokter)
-- per (parameter, triase), divalidasi & ditandatangani klinisi.
-- Idempoten: if-not-exists, drop-if-exists sebelum policy.
-- Bergantung pada V1.1.1 (tabel parameters & enum triage_level).
-- ============================================================================

create table if not exists knowledge_entries (
  id              uuid primary key default gen_random_uuid(),
  parameter_id    uuid not null references parameters(id) on delete cascade,
  triage          triage_level not null,
  artinya         text not null,
  penyebab        text,
  saran           text,
  kapan_ke_dokter text,
  -- Auditabilitas — sumber & sign-off klinisi (WAJIB)
  source          text not null,
  signed_off_by   text not null,
  signed_off_at   date not null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  constraint knowledge_entries_uniq unique (parameter_id, triage)
);
create index if not exists idx_knowledge_param on knowledge_entries(parameter_id);

alter table knowledge_entries enable row level security;

-- Konten edukatif terkurasi: dibaca semua user terautentikasi, ditulis admin saja.
drop policy if exists "pengetahuan readable" on knowledge_entries;
create policy "pengetahuan readable" on knowledge_entries
  for select using (true);

drop policy if exists "pengetahuan admin write" on knowledge_entries;
create policy "pengetahuan admin write" on knowledge_entries
  for all using (auth.jwt() ->> 'role' = 'ava_admin')
  with check (auth.jwt() ->> 'role' = 'ava_admin');

-- ============================================================================
-- Posisi SaMD: tabel ini menyimpan EDUKASI, bukan diagnosis. Penjelas LLM hanya
-- merangkai isi terkurasi ini; triase tetap deterministik (@ava/domain). Output
-- ke pengguna selalu is_educational=true + disclaimer (analysis_results, V1.0).
-- ============================================================================


-- ┌── migrations/20260628094001_v112_seed_pengetahuan.sql
-- ============================================================================
-- AVA Health — Migrasi V1.1.2 : Seed Basis Pengetahuan (CONTOH)
-- ----------------------------------------------------------------------------
-- Idempoten: upsert on (parameter_id, triage).
-- KEJUJURAN MEDIS: konten di bawah CONTOH untuk pengembangan. Sebelum produksi
-- WAJIB divalidasi & ditandatangani klinisi; ganti signed_off_by & source.
-- Contoh ini mengikuti format Blueprint §04 (gula darah puasa).
-- ============================================================================

insert into knowledge_entries
  (parameter_id, triage, artinya, penyebab, saran, kapan_ke_dokter, source, signed_off_by, signed_off_at)
values
  (
    (select id from parameters where code='glukosa_puasa'), 'normal',
    'Nilai gula darah puasamu berada dalam rentang yang umum dianggap normal (≈70–99 mg/dL). Ini gambaran satu waktu, bukan jaminan, jadi pemantauan rutin tetap baik.',
    'Pola makan seimbang, aktivitas fisik teratur, dan tidur cukup membantu menjaga nilai ini.',
    'Pertahankan kebiasaan sehat; periksa berkala sesuai anjuran tenaga medis.',
    'Bila muncul gejala seperti sering haus berlebihan atau sering buang air kecil, konsultasikan.',
    'Seed V1.1.2 (contoh)', 'BELUM DITANDATANGANI — placeholder', '2026-06-28'
  ),
  (
    (select id from parameters where code='glukosa_puasa'), 'perhatian',
    'Nilaimu di atas rentang puasa yang umum dianggap normal (≈70–99 mg/dL) dan masuk kisaran yang sering disebut "waspada". Ini gambaran satu waktu, bukan vonis.',
    'Bisa dipengaruhi makan/minum manis sebelum tes, kurang tidur, stres, kurang gerak, atau pola makan beberapa hari terakhir. Penyebab pastimu hanya bisa dipastikan tenaga medis.',
    'Ulangi pemeriksaan puasa di hari lain untuk pola yang lebih andal; kurangi gula sederhana; tambah aktivitas fisik ringan. Pertimbangkan cek HbA1c.',
    'Bila berulang tinggi, atau disertai sering haus, sering buang air kecil, lelah berlebihan, atau pandangan kabur — konsultasikan.',
    'Seed V1.1.2 (contoh)', 'BELUM DITANDATANGANI — placeholder', '2026-06-28'
  ),
  (
    (select id from parameters where code='glukosa_puasa'), 'segera',
    'Nilaimu cukup jauh di atas rentang puasa normal dan sebaiknya tidak ditunda untuk ditindaklanjuti. Ini tetap gambaran satu waktu, bukan diagnosis.',
    'Beberapa faktor sementara bisa menaikkan angka, tetapi nilai setinggi ini perlu konfirmasi tenaga medis untuk memahami penyebabnya.',
    'Sebaiknya segera rencanakan konsultasi. Sementara itu, hindari konsumsi gula berlebih dan tetap terhidrasi.',
    'Segera konsultasikan, terlebih bila disertai gejala seperti sangat haus, sering buang air kecil, mual, atau lemas berat. AVA bisa menghubungkanmu ke dokter.',
    'Seed V1.1.2 (contoh)', 'BELUM DITANDATANGANI — placeholder', '2026-06-28'
  )
on conflict (parameter_id, triage) do update
  set artinya = excluded.artinya, penyebab = excluded.penyebab, saran = excluded.saran,
      kapan_ke_dokter = excluded.kapan_ke_dokter, source = excluded.source,
      signed_off_by = excluded.signed_off_by, signed_off_at = excluded.signed_off_at;


-- ┌── migrations/20260705100000_v113_wearable.sql
-- 20260705100000_v113_wearable.sql
-- Fase A: fondasi koneksi smartwatch/wearable.
--
-- Data wearable adalah data biometrik SENSITIF. Dua pengaman:
--   1. Ingest hanya boleh jalan bila ada `consents.purpose = 'wearable_sync'`
--      berstatus 'granted' (ditegakkan di Edge Function ingest-wearable).
--   2. Reading wearable masuk lewat `health_readings` yang SUDAH dilindungi RLS
--      "customer owns readings" — pemilik saja yang bisa baca/tulis.
--
-- Metrik gaya hidup (langkah, tidur) TIDAK ditriase; hanya metrik klinis
-- (HR/SpO₂/suhu/tekanan darah) yang menghasilkan analysis_results.

-- Sumber `source` yang dikenal untuk health_readings (dokumentasi jujur;
-- kolomnya sengaja tetap `text` agar fleksibel menerima provider baru).
comment on column health_readings.source is
  'Asal data: manual | health_connect | apple_health | fitbit | garmin | zepp | samsung_health | manual_wearable';

-- Koneksi wearable per pengguna per provider (jejak izin & sinkronisasi).
create table if not exists wearable_connections (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null references profiles(id) on delete cascade,
  provider       text not null check (provider in (
                   'health_connect','apple_health','fitbit','garmin','zepp','samsung_health','manual_wearable')),
  external_account text,                     -- id akun di sisi provider (opsional)
  scopes         text[] not null default '{}',
  status         text not null default 'active' check (status in ('active','revoked')),
  connected_at   timestamptz not null default now(),
  last_sync_at   timestamptz,
  revoked_at     timestamptz,
  unique (customer_id, provider)
);

create index if not exists idx_wearable_connections_customer on wearable_connections(customer_id);

alter table wearable_connections enable row level security;

-- Pemilik mengelola koneksinya sendiri (baca/tulis/cabut).
drop policy if exists "customer manages own wearable connections" on wearable_connections;
create policy "customer manages own wearable connections" on wearable_connections
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- Admin AVA boleh membaca (pemantauan operasional, bukan isi data kesehatan).
drop policy if exists "admin reads wearable connections" on wearable_connections;
create policy "admin reads wearable connections" on wearable_connections
  for select using (app.is_admin());

grant select, insert, update, delete on wearable_connections to authenticated;


-- ┌── migrations/20260705110000_v114_wellness.sql
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


-- ┌── migrations/20260705120000_v115_caregiver.sql
-- 20260705120000_v115_caregiver.sql
-- Fase C: berbagi ke pendamping/keluarga (mis. anak merawat orang tua).
--
-- Pola sama dengan "dokter baca reading yang dibagikan": akses ditegakkan RLS,
-- default DENY. Pendamping hanya bisa MEMBACA data pasien dalam SCOPE yang
-- diberikan, selama tautan berstatus 'active'. Pencabutan memutus akses seketika.
--
-- Alur undangan (tanpa direktori pengguna, menjaga privasi):
--   1. Pasien membuat tautan 'pending' dengan invite_token acak.
--   2. Pasien membagikan token itu ke pendamping (di luar aplikasi).
--   3. Pendamping menukar token via app.claim_caregiver_invite() → 'active'.

create table if not exists caregiver_links (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references profiles(id) on delete cascade,
  caregiver_id uuid references profiles(id) on delete cascade, -- null s/d diklaim
  invite_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  status       text not null default 'pending' check (status in ('pending','active','revoked')),
  scopes       text[] not null default '{readings,wellness}',
  invited_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  revoked_at   timestamptz,
  unique (patient_id, caregiver_id)
);

create index if not exists idx_caregiver_links_patient   on caregiver_links(patient_id);
create index if not exists idx_caregiver_links_caregiver on caregiver_links(caregiver_id);

-- Helper reusable untuk RLS lintas-tabel (SECURITY DEFINER agar lewati RLS
-- saat memeriksa keberadaan tautan). Mengecek: penonton = pendamping aktif
-- untuk `patient` DAN scope `need` diberikan.
create or replace function app.is_active_caregiver_of(patient uuid, need text)
returns boolean language sql stable security definer set search_path = public, app as $$
  select exists (
    select 1 from public.caregiver_links l
    where l.caregiver_id = auth.uid()
      and l.patient_id = patient
      and l.status = 'active'
      and need = any (l.scopes)
  );
$$;

-- Tukar token undangan → jadikan penonton sbg pendamping aktif. SECURITY DEFINER
-- karena baris belum berstatus milik pendamping (RLS pasien tak mengizinkannya).
-- Di schema `public` agar bisa dipanggil via RPC PostgREST oleh klien.
create or replace function public.claim_caregiver_invite(token text)
returns uuid language plpgsql security definer set search_path = public, app as $$
declare lid uuid;
begin
  update public.caregiver_links
     set caregiver_id = auth.uid(), status = 'active', accepted_at = now()
   where invite_token = token
     and status = 'pending'
     and caregiver_id is null
     and patient_id <> auth.uid()          -- tak bisa mendampingi diri sendiri
  returning id into lid;
  return lid;                               -- null bila token tak valid/terpakai
end;
$$;

alter table caregiver_links enable row level security;

-- Pasien mengelola tautan miliknya (undang, atur scope, cabut).
drop policy if exists "patient manages own caregiver links" on caregiver_links;
create policy "patient manages own caregiver links" on caregiver_links
  for all using (patient_id = auth.uid()) with check (patient_id = auth.uid());

-- Pendamping melihat tautan yang menautkannya (untuk melihat/mencabut sendiri).
drop policy if exists "caregiver sees own links" on caregiver_links;
create policy "caregiver sees own links" on caregiver_links
  for select using (caregiver_id = auth.uid());

-- Pendamping boleh mencabut keterlibatannya sendiri (bukan mengubah pemilik).
drop policy if exists "caregiver revokes own link" on caregiver_links;
create policy "caregiver revokes own link" on caregiver_links
  for update using (caregiver_id = auth.uid()) with check (caregiver_id = auth.uid());

-- ---------- Akses baca pendamping lintas-tabel (scope-gated) ----------
drop policy if exists "caregiver reads linked readings" on health_readings;
create policy "caregiver reads linked readings" on health_readings
  for select using (app.is_active_caregiver_of(customer_id, 'readings'));

drop policy if exists "caregiver reads linked analysis" on analysis_results;
create policy "caregiver reads linked analysis" on analysis_results
  for select using (
    exists (
      select 1 from health_readings r
      where r.id = analysis_results.reading_id
        and app.is_active_caregiver_of(r.customer_id, 'readings')
    )
  );

drop policy if exists "caregiver reads linked wellness" on wellness_enrollments;
create policy "caregiver reads linked wellness" on wellness_enrollments
  for select using (app.is_active_caregiver_of(customer_id, 'wellness'));

drop policy if exists "caregiver reads linked checkins" on wellness_checkins;
create policy "caregiver reads linked checkins" on wellness_checkins
  for select using (app.is_active_caregiver_of(customer_id, 'wellness'));

grant select, insert, update, delete on caregiver_links to authenticated;
grant execute on function public.claim_caregiver_invite(text) to authenticated;
grant execute on function app.is_active_caregiver_of(uuid, text) to authenticated;


-- ┌── migrations/20260705130000_v116_billing.sql
-- 20260705130000_v116_billing.sql
-- Fase C: monetisasi — langganan premium + catatan pembayaran.
--
-- ARSITEKTUR JUJUR (anti self-grant):
--   • Pelanggan boleh MEMBUAT & MEMBACA pembayaran miliknya (status 'pending')
--     dan MEMBACA langganannya, tapi TIDAK boleh menulis langsung ke
--     subscriptions atau menandai pembayaran 'paid'. Itu wewenang verifikasi.
--   • Aktivasi langganan HANYA lewat fungsi konfirmasi pembayaran (SECURITY
--     DEFINER). Di sini `mock_confirm_payment` menyimulasikan webhook provider
--     (Midtrans/Xendit — keputusan terbuka #3). Di produksi, fungsi ini diganti
--     Edge Function webhook ber-service_role, dan versi mock ini dihapus.

create table if not exists subscriptions (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references profiles(id) on delete cascade,
  plan         text not null default 'free' check (plan in ('free','premium')),
  status       text not null default 'active' check (status in ('active','expired','cancelled')),
  started_at   timestamptz not null default now(),
  expires_at   timestamptz,
  created_at   timestamptz not null default now(),
  unique (customer_id)
);

create table if not exists payments (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references profiles(id) on delete cascade,
  purpose      text not null check (purpose in ('subscription','consultation')),
  ref_id       uuid,                                  -- mis. consultation_id
  amount       numeric not null check (amount >= 0),
  currency     text not null default 'IDR',
  provider     text not null default 'mock',
  status       text not null default 'pending' check (status in ('pending','paid','failed')),
  external_id  text,
  created_at   timestamptz not null default now(),
  paid_at      timestamptz
);

create index if not exists idx_subscriptions_customer on subscriptions(customer_id);
create index if not exists idx_payments_customer on payments(customer_id);

alter table subscriptions enable row level security;
alter table payments      enable row level security;

-- Langganan: pelanggan hanya MEMBACA miliknya. Penulisan lewat fungsi (definer).
drop policy if exists "customer reads own subscription" on subscriptions;
create policy "customer reads own subscription" on subscriptions
  for select using (customer_id = auth.uid());
drop policy if exists "admin reads subscriptions" on subscriptions;
create policy "admin reads subscriptions" on subscriptions
  for select using (app.is_admin());

-- Pembayaran: pelanggan boleh MEMBUAT & MEMBACA miliknya (status awal 'pending').
drop policy if exists "customer creates own payment" on payments;
create policy "customer creates own payment" on payments
  for insert with check (customer_id = auth.uid() and status = 'pending');
drop policy if exists "customer reads own payments" on payments;
create policy "customer reads own payments" on payments
  for select using (customer_id = auth.uid());
drop policy if exists "admin reads payments" on payments;
create policy "admin reads payments" on payments
  for select using (app.is_admin());

-- Konfirmasi pembayaran (SIMULASI webhook). Menandai 'paid' & mengaktifkan
-- langganan bila purpose='subscription'. Diikat ke pemilik pembayaran.
create or replace function public.mock_confirm_payment(p_id uuid)
returns boolean language plpgsql security definer set search_path = public, app as $$
declare pay record;
begin
  select * into pay from public.payments
   where id = p_id and customer_id = auth.uid() and status = 'pending';
  if not found then
    return false;
  end if;

  update public.payments set status = 'paid', paid_at = now() where id = pay.id;

  if pay.purpose = 'subscription' then
    insert into public.subscriptions (customer_id, plan, status, started_at, expires_at)
    values (pay.customer_id, 'premium', 'active', now(), now() + interval '30 days')
    on conflict (customer_id) do update
      set plan = 'premium', status = 'active', started_at = now(),
          expires_at = now() + interval '30 days';
  end if;
  return true;
end;
$$;

-- Batalkan langganan sendiri (definer, karena klien tak punya write policy).
create or replace function public.cancel_my_subscription()
returns boolean language plpgsql security definer set search_path = public, app as $$
begin
  update public.subscriptions
     set status = 'cancelled'
   where customer_id = auth.uid() and status = 'active';
  return found;
end;
$$;

grant select, insert on payments to authenticated;
grant select on subscriptions to authenticated;
grant execute on function public.mock_confirm_payment(uuid) to authenticated;
grant execute on function public.cancel_my_subscription() to authenticated;


-- ┌── migrations/20260705140000_v117_marketplace.sql
-- 20260705140000_v117_marketplace.sql
-- Marketplace alat ber-badge: menutup flywheel QC → pembelian.
--
-- Prinsip kepercayaan: sebuah listing hanya "AVA Verified" bila vendornya punya
-- unit dari model itu dengan BADGE AKTIF. Status verifikasi diturunkan langsung
-- dari data badge (fungsi verified_listing_ids), bukan flag yang bisa basi.

create table if not exists product_listings (
  id          uuid primary key default gen_random_uuid(),
  vendor_id   uuid not null references organizations(id) on delete cascade,
  model_id    uuid not null references device_models(id),
  title       text not null,
  description text,
  price       numeric not null check (price >= 0),
  stock       int not null default 0 check (stock >= 0),
  status      text not null default 'active' check (status in ('active','inactive')),
  created_at  timestamptz not null default now()
);
create index if not exists idx_listings_vendor on product_listings(vendor_id);
create index if not exists idx_listings_status on product_listings(status);

create table if not exists orders (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending','paid','shipped','delivered','cancelled')),
  total       numeric not null check (total >= 0),
  created_at  timestamptz not null default now()
);
create index if not exists idx_orders_customer on orders(customer_id);

create table if not exists order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  listing_id  uuid not null references product_listings(id),
  vendor_id   uuid not null references organizations(id),
  title       text not null,
  qty         int not null check (qty > 0),
  unit_price  numeric not null check (unit_price >= 0)
);
create index if not exists idx_order_items_order  on order_items(order_id);
create index if not exists idx_order_items_vendor on order_items(vendor_id);

-- Helper SECURITY DEFINER untuk memutus rekursi antar-policy orders↔order_items
-- (masing-masing mengecek keberadaan di tabel lain TANPA memicu RLS tabel itu).
create or replace function app.owns_order(p_order uuid)
returns boolean language sql stable security definer set search_path = public, app as $$
  select exists (select 1 from public.orders o where o.id = p_order and o.customer_id = auth.uid());
$$;
create or replace function app.vendor_in_order(p_order uuid)
returns boolean language sql stable security definer set search_path = public, app as $$
  select exists (
    select 1 from public.order_items oi where oi.order_id = p_order and app.is_member_of(oi.vendor_id)
  );
$$;

alter table product_listings enable row level security;
alter table orders           enable row level security;
alter table order_items      enable row level security;

-- Listing: publik boleh melihat yang AKTIF; vendor mengelola miliknya.
drop policy if exists "public reads active listings" on product_listings;
create policy "public reads active listings" on product_listings
  for select using (status = 'active');
drop policy if exists "vendor manages own listings" on product_listings;
create policy "vendor manages own listings" on product_listings
  for all using (app.is_member_of(vendor_id)) with check (app.is_member_of(vendor_id));

-- Order: pelanggan mengelola miliknya; vendor MELIHAT order yang memuat itemnya.
drop policy if exists "customer manages own orders" on orders;
create policy "customer manages own orders" on orders
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());
drop policy if exists "vendor sees orders with own items" on orders;
create policy "vendor sees orders with own items" on orders
  for select using (app.vendor_in_order(id));
drop policy if exists "admin reads orders" on orders;
create policy "admin reads orders" on orders for select using (app.is_admin());

-- Order items: pelanggan (via ordernya) & vendor (item miliknya).
-- Memakai helper definer agar tak memicu RLS tabel orders (anti-rekursi).
drop policy if exists "customer manages items of own order" on order_items;
create policy "customer manages items of own order" on order_items
  for all using (app.owns_order(order_id)) with check (app.owns_order(order_id));
drop policy if exists "vendor sees own order items" on order_items;
create policy "vendor sees own order items" on order_items
  for select using (app.is_member_of(vendor_id));

-- Verifikasi listing dari badge aktif (selalu segar; tak bisa basi).
create or replace function public.verified_listing_ids()
returns setof uuid language sql stable security definer set search_path = public, app as $$
  select pl.id from public.product_listings pl
  where pl.status = 'active'
    and exists (
      select 1 from public.devices d
      join public.badges b on b.device_id = d.id
      where d.vendor_id = pl.vendor_id and d.model_id = pl.model_id and b.status = 'active'
    );
$$;

-- Perluas tujuan pembayaran untuk mencakup 'order'.
alter table payments drop constraint if exists payments_purpose_check;
alter table payments add constraint payments_purpose_check
  check (purpose in ('subscription','consultation','order'));

-- Perbarui konfirmasi pembayaran (mock webhook) agar juga menandai order 'paid'.
create or replace function public.mock_confirm_payment(p_id uuid)
returns boolean language plpgsql security definer set search_path = public, app as $$
declare pay record;
begin
  select * into pay from public.payments
   where id = p_id and customer_id = auth.uid() and status = 'pending';
  if not found then
    return false;
  end if;

  update public.payments set status = 'paid', paid_at = now() where id = pay.id;

  if pay.purpose = 'subscription' then
    insert into public.subscriptions (customer_id, plan, status, started_at, expires_at)
    values (pay.customer_id, 'premium', 'active', now(), now() + interval '30 days')
    on conflict (customer_id) do update
      set plan = 'premium', status = 'active', started_at = now(),
          expires_at = now() + interval '30 days';
  elsif pay.purpose = 'order' and pay.ref_id is not null then
    update public.orders set status = 'paid'
     where id = pay.ref_id and customer_id = auth.uid() and status = 'pending';
  end if;
  return true;
end;
$$;

grant select on product_listings to anon, authenticated;
grant insert, update, delete on product_listings to authenticated;
grant select, insert, update, delete on orders to authenticated;
grant select, insert, update, delete on order_items to authenticated;
grant execute on function public.verified_listing_ids() to anon, authenticated;


-- ┌── migrations/20260705150000_v118_corporate.sql
-- 20260705150000_v118_corporate.sql
-- Wellness korporat / B2B.
--
-- FIREWALL PRIVASI (inti pilar ini):
--   • Pemberi kerja HANYA melihat AGREGAT teranonimkan lewat fungsi
--     employer_wellness_summary — TIDAK PERNAH data kesehatan individu.
--   • K-anonimitas: bila peserta < 5, angka disembunyikan (suppressed) agar
--     individu tak bisa dikenali.
--   • Tidak ada kebijakan RLS yang memberi pemberi kerja akses ke health_readings
--     / analysis_results / wellness_* karyawan. Default DENY tetap berlaku.

-- Izinkan organisasi berjenis 'employer' + kode gabung untuk karyawan.
alter table organizations drop constraint if exists organizations_kind_check;
alter table organizations add constraint organizations_kind_check
  check (kind in ('faskes','vendor','lab','employer'));
alter table organizations add column if not exists join_code text unique;

-- Keikutsertaan karyawan pada program wellness pemberi kerja.
create table if not exists employer_enrollments (
  id          uuid primary key default gen_random_uuid(),
  employer_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references profiles(id) on delete cascade,
  status      text not null default 'active' check (status in ('active','left')),
  joined_at   timestamptz not null default now(),
  unique (employer_id, customer_id)
);
create index if not exists idx_employer_enroll_employer on employer_enrollments(employer_id);
create index if not exists idx_employer_enroll_customer on employer_enrollments(customer_id);

alter table employer_enrollments enable row level security;

-- Karyawan mengelola keikutsertaannya sendiri.
drop policy if exists "employee manages own enrollment" on employer_enrollments;
create policy "employee manages own enrollment" on employer_enrollments
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- Admin pemberi kerja (anggota org employer) MELIHAT daftar keikutsertaan
-- (jumlah/kepesertaan) — BUKAN data kesehatan (tak ada policy lintas-tabel).
drop policy if exists "employer admin sees enrollments" on employer_enrollments;
create policy "employer admin sees enrollments" on employer_enrollments
  for select using (app.is_member_of(employer_id) or app.is_admin());

-- Karyawan boleh melihat identitas pemberi kerja yang diikutinya (nama saja).
drop policy if exists "employee reads own employer org" on organizations;
create policy "employee reads own employer org" on organizations
  for select using (
    kind = 'employer' and exists (
      select 1 from employer_enrollments e
      where e.employer_id = organizations.id
        and e.customer_id = auth.uid() and e.status = 'active'
    )
  );

grant select, insert, update, delete on employer_enrollments to authenticated;

-- Karyawan bergabung via kode pemberi kerja (SECURITY DEFINER; RLS pemberi
-- kerja tak mengizinkan menulis atas nama karyawan).
create or replace function public.join_employer(code text)
returns uuid language plpgsql security definer set search_path = public, app as $$
declare emp uuid;
begin
  select id into emp from public.organizations
   where kind = 'employer' and join_code = code;
  if emp is null then
    return null;
  end if;
  insert into public.employer_enrollments (employer_id, customer_id, status)
  values (emp, auth.uid(), 'active')
  on conflict (employer_id, customer_id) do update set status = 'active';
  return emp;
end;
$$;

-- Ringkasan AGREGAT untuk pemberi kerja — dengan k-anonimitas. Mengembalikan
-- HANYA hitungan; tak pernah baris individu. Hanya admin employer / ava_admin.
create or replace function public.employer_wellness_summary(p_employer uuid)
returns table(participants int, suppressed boolean, active_wellness int)
language plpgsql stable security definer set search_path = public, app as $$
declare k constant int := 5; n int; aw int;
begin
  if not (app.is_member_of(p_employer) or app.is_admin()) then
    return; -- tak berhak → himpunan kosong
  end if;

  select count(*) into n from public.employer_enrollments e
   where e.employer_id = p_employer and e.status = 'active';

  if n < k then
    participants := n; suppressed := true; active_wellness := null;
    return next; return;
  end if;

  select count(distinct e.customer_id) into aw
    from public.employer_enrollments e
    join public.wellness_enrollments w
      on w.customer_id = e.customer_id and w.status = 'active'
   where e.employer_id = p_employer and e.status = 'active';

  participants := n; suppressed := false; active_wellness := aw;
  return next;
end;
$$;

-- Admin pemberi kerja mengatur/mengacak kode gabung (SECURITY DEFINER; klien
-- tak boleh menulis organizations langsung). Kode dinormalkan A–Z/0–9.
create or replace function public.set_employer_join_code(p_employer uuid, p_code text)
returns text language plpgsql security definer set search_path = public, app as $$
declare final text;
begin
  if not app.is_member_of(p_employer) then
    return null; -- hanya admin pemberi kerja
  end if;
  final := nullif(regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g'), '');
  if final is null then
    final := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)); -- acak
  end if;
  update public.organizations set join_code = final
   where id = p_employer and kind = 'employer';
  return final;
end;
$$;

grant execute on function public.join_employer(text) to authenticated;
grant execute on function public.employer_wellness_summary(uuid) to authenticated;
grant execute on function public.set_employer_join_code(uuid, text) to authenticated;


-- ┌── migrations/20260705160000_v119_customer_profile.sql
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


-- ┌── migrations/20260705170000_v120_consult_notes.sql
-- 20260705170000_v120_consult_notes.sql
-- Catatan/resep dokter pasca-konsultasi, tampil ke pasien.
-- Tak perlu RLS baru: pasien sudah membaca baris konsultasinya sendiri
-- ("customer sees own consultations"), dan dokter menulis via
-- "doctor updates assigned consultation".
alter table consultations add column if not exists doctor_note text;


-- ┌── migrations/20260705180000_v121_consult_rating.sql
-- 20260705180000_v121_consult_rating.sql
-- Rating pasien untuk konsultasi (1–5) + komentar opsional.
-- Tak perlu RLS baru: pasien menulis via "customer updates own consultation",
-- dokter membaca via "doctor sees assigned consultations".
alter table consultations add column if not exists rating int check (rating between 1 and 5);
alter table consultations add column if not exists rating_comment text;


-- ┌── migrations/20260705190000_v122_push_subscriptions.sql
-- 20260705190000_v122_push_subscriptions.sql
-- Web Push (E1): simpan langganan push browser per pengguna.
-- Pengiriman dilakukan Edge Function (send-push) ber-service_role memakai VAPID.
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_push_subs_customer on push_subscriptions(customer_id);

alter table push_subscriptions enable row level security;

-- Pemilik mengelola langganan push-nya sendiri.
drop policy if exists "customer manages own push subs" on push_subscriptions;
create policy "customer manages own push subs" on push_subscriptions
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

grant select, insert, update, delete on push_subscriptions to authenticated;


-- ┌── migrations/20260705200000_v123_consult_messages.sql
-- 20260705200000_v123_consult_messages.sql
-- Chat konsultasi (D2): pesan antara pasien & dokter dalam satu konsultasi.
-- RLS: hanya PESERTA konsultasi (customer_id / doctor_id) boleh baca & kirim;
-- pengirim wajib dirinya sendiri.
create table if not exists consultation_messages (
  id              uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references consultations(id) on delete cascade,
  sender_id       uuid not null references profiles(id),
  body            text not null check (length(btrim(body)) > 0),
  created_at      timestamptz not null default now()
);
create index if not exists idx_consult_msgs_consult on consultation_messages(consultation_id, created_at);

alter table consultation_messages enable row level security;

-- Fungsi bantu: apakah penonton peserta konsultasi ini? (SECURITY DEFINER agar
-- pengecekan tak memicu RLS consultations).
create or replace function app.is_consult_participant(p_consult uuid)
returns boolean language sql stable security definer set search_path = public, app as $$
  select exists (
    select 1 from public.consultations c
    where c.id = p_consult and (c.customer_id = auth.uid() or c.doctor_id = auth.uid())
  );
$$;

drop policy if exists "participant reads consult messages" on consultation_messages;
create policy "participant reads consult messages" on consultation_messages
  for select using (app.is_consult_participant(consultation_id));

drop policy if exists "participant sends consult message" on consultation_messages;
create policy "participant sends consult message" on consultation_messages
  for insert with check (sender_id = auth.uid() and app.is_consult_participant(consultation_id));

grant select, insert on consultation_messages to authenticated;
grant execute on function app.is_consult_participant(uuid) to authenticated;


-- ┌── migrations/20260705210000_v124_vendor_fulfillment.sql
-- 20260705210000_v124_vendor_fulfillment.sql
-- Vendor memenuhi pesanan: ubah status order yang memuat itemnya.
-- SECURITY DEFINER karena RLS orders hanya memberi vendor akses SELECT.
-- Menegakkan keanggotaan (app.vendor_in_order) + transisi fulfillment yang sah.
create or replace function public.vendor_set_order_status(p_order uuid, p_status text)
returns boolean language plpgsql security definer set search_path = public, app as $$
declare cur text;
begin
  if not app.vendor_in_order(p_order) then
    return false;                                  -- bukan vendor untuk order ini
  end if;
  select status into cur from public.orders where id = p_order;
  if cur is null then return false; end if;
  -- Transisi fulfillment yang boleh dilakukan vendor.
  if not (
       (cur = 'paid'    and p_status in ('shipped', 'cancelled'))
    or (cur = 'shipped' and p_status in ('delivered', 'cancelled'))
  ) then
    return false;
  end if;
  update public.orders set status = p_status where id = p_order;
  return true;
end;
$$;

grant execute on function public.vendor_set_order_status(uuid, text) to authenticated;


-- ┌── migrations/20260705220000_v125_faskes.sql
-- 20260705220000_v125_faskes.sql
-- Modul Faskes (fasilitas kesehatan): dokter bergabung ke faskes (keanggotaan
-- organisasi), admin faskes melihat AGREGAT operasional dokternya.
--
-- PRIVASI: admin faskes TIDAK melihat data kesehatan pasien atau isi konsultasi.
-- Hanya ringkasan jumlah/rating/pendapatan (fungsi definer faskes_summary).
--
-- kind='faskes' & organizations.join_code sudah ada (migrasi awal + v118).

-- Anggota organisasi boleh melihat sesama anggota (mis. admin faskes → dokternya).
drop policy if exists "member reads co-members" on organization_members;
create policy "member reads co-members" on organization_members
  for select using (app.is_member_of(organization_id));

-- Dokter bergabung ke faskes via kode (SECURITY DEFINER; RLS members tak
-- mengizinkan insert langsung). Hanya profil berperan 'doctor'.
create or replace function public.join_faskes(code text)
returns uuid language plpgsql security definer set search_path = public, app as $$
declare fid uuid;
begin
  if app.current_role() <> 'doctor' then return null; end if;
  select id into fid from public.organizations where kind = 'faskes' and join_code = code;
  if fid is null then return null; end if;
  insert into public.organization_members(organization_id, profile_id)
  values (fid, auth.uid())
  on conflict do nothing;
  return fid;
end;
$$;

-- Admin faskes mengatur/mengacak kode gabung dokter.
create or replace function public.faskes_set_join_code(p_faskes uuid, p_code text)
returns text language plpgsql security definer set search_path = public, app as $$
declare final text;
begin
  if not app.is_member_of(p_faskes) then return null; end if;
  final := nullif(regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g'), '');
  if final is null then final := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)); end if;
  update public.organizations set join_code = final where id = p_faskes and kind = 'faskes';
  return final;
end;
$$;

-- Ringkasan AGREGAT faskes (hanya anggota/admin). Tak pernah data pasien.
create or replace function public.faskes_summary(p_faskes uuid)
returns table(doctors int, consultations int, completed int, avg_rating numeric, gross numeric)
language plpgsql stable security definer set search_path = public, app as $$
begin
  if not (app.is_member_of(p_faskes) or app.is_admin()) then
    return;
  end if;
  return query
  with docs as (
    select om.profile_id as id
    from public.organization_members om
    join public.profiles p on p.id = om.profile_id and p.role = 'doctor'
    where om.organization_id = p_faskes
  ), cons as (
    select c.status, c.rating, c.fee from public.consultations c
    where c.doctor_id in (select id from docs)
  )
  select
    (select count(*)::int from docs),
    (select count(*)::int from cons),
    (select count(*)::int from cons where status = 'completed'),
    (select round(avg(rating), 1) from cons where rating is not null),
    (select coalesce(sum(fee), 0) from cons where status = 'completed');
end;
$$;

grant execute on function public.join_faskes(text) to authenticated;
grant execute on function public.faskes_set_join_code(uuid, text) to authenticated;
grant execute on function public.faskes_summary(uuid) to authenticated;

