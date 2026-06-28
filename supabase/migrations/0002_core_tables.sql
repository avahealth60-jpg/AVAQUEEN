-- 0002_core_tables.sql
-- Tabel inti + fungsi helper untuk RLS.
-- Asumsi lingkungan Supabase: schema `auth`, fungsi `auth.uid()`, dan role
-- `anon`/`authenticated`/`service_role` sudah disediakan platform.
-- (Untuk pengujian lokal, harness menyuntikkan stub yang setara — lihat supabase/tests.)

create schema if not exists app;

-- Profil pengguna; sumber kebenaran PERAN aplikasi.
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid primary key,                 -- = auth.users.id
  role        user_role not null default 'customer',
  full_name   text,
  created_at  timestamptz not null default now()
);

-- Organisasi mitra (faskes, vendor, lab).
CREATE TABLE IF NOT EXISTS organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  kind        text not null check (kind in ('faskes','vendor','lab')),
  created_at  timestamptz not null default now()
);

-- Keanggotaan pengguna pada organisasi (mis. petugas vendor / lab).
CREATE TABLE IF NOT EXISTS organization_members (
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
CREATE TABLE IF NOT EXISTS device_models (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text,
  manufacturer text,
  nie_no      text,                              -- izin edar / NIE (Permenkes 62/2017)
  calibration_interval_months int not null default 12 check (calibration_interval_months > 0)
);

CREATE TABLE IF NOT EXISTS devices (
  id          uuid primary key default gen_random_uuid(),
  model_id    uuid not null references device_models(id),
  serial      text unique not null,
  vendor_id   uuid not null references organizations(id),
  status      text not null default 'registered',
  registered_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS calibrations (
  id           uuid primary key default gen_random_uuid(),
  device_id    uuid not null references devices(id),
  lab_id       uuid not null references organizations(id),
  performed_at date not null,
  next_due_at  date not null,
  certificate_url text,
  performed_by text,
  created_at   timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS IF NOT EXISTS qc_results (
  id              uuid primary key default gen_random_uuid(),
  calibration_id  uuid not null references calibrations(id),
  result          qc_result not null,
  metrics         jsonb,
  notes           text,
  created_at      timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS badges (
  id              uuid primary key default gen_random_uuid(),
  device_id       uuid not null references devices(id),
  calibration_id  uuid not null references calibrations(id),
  status          text not null default 'active',
  issued_at       timestamptz not null default now(),
  expires_at      date not null
);

-- ---------- Hasil kesehatan & AI (posisi edukatif dikunci di skema) ----------
CREATE TABLE IF NOT EXISTS health_readings (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references profiles(id),
  reading_type text not null,
  value        jsonb not null,
  unit         text,
  taken_at     timestamptz not null default now(),
  source       text not null default 'manual'
);

CREATE TABLE IF NOT EXISTS analysis_results (
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
CREATE TABLE IF NOT EXISTS consultations (
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
CREATE TABLE IF NOT EXISTS consents (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id),
  purpose     text not null,
  status      consent_status not null default 'granted',
  granted_at  timestamptz not null default now(),
  withdrawn_at timestamptz
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid,
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  detail      jsonb,
  created_at  timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS notifications (
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
