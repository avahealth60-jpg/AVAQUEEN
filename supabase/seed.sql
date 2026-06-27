-- ════════════════════════════════════════════════════════════════
-- AVA Health — seed data untuk DEVELOPMENT saja
-- ════════════════════════════════════════════════════════════════
-- CATATAN PENTING:
--   profiles.id = auth.users.id di produksi. Seed ini menulis ke
--   public.profiles secara langsung untuk dev lokal. Di Supabase asli,
--   buat user via Auth dulu, lalu cocokkan UUID-nya.
--   Jalankan dengan service_role / superuser (melewati RLS).
--   (Tabel berada di schema `public`; fungsi helper RLS di schema `app`.)
-- ════════════════════════════════════════════════════════════════

set search_path = public;

-- ── Profiles (aktor) ─────────────────────────────────────────────
insert into profiles (id, role, full_name) values
  ('11111111-1111-1111-1111-111111111111', 'customer',  'Alice Pasien'),
  ('22222222-2222-2222-2222-222222222222', 'customer',  'Bob Pasien'),
  ('33333333-3333-3333-3333-333333333333', 'doctor',    'dr. Carol'),
  ('44444444-4444-4444-4444-444444444444', 'vendor',    'Vance (Vendor V1)'),
  ('55555555-5555-5555-5555-555555555555', 'vendor',    'Victor (Vendor V2)'),
  ('66666666-6666-6666-6666-666666666666', 'lab',       'Lana (Lab Kalibrasi)'),
  ('77777777-7777-7777-7777-777777777777', 'ava_admin', 'Admin AVA')
on conflict (id) do nothing;

-- ── Organizations ────────────────────────────────────────────────
insert into organizations (id, name, kind) values
  ('a0000000-0000-0000-0000-000000000001', 'Vendor Alkes V1',   'vendor'),
  ('a0000000-0000-0000-0000-000000000002', 'Vendor Alkes V2',   'vendor'),
  ('b0000000-0000-0000-0000-000000000001', 'Lab Kalibrasi Nusantara', 'lab'),
  ('c0000000-0000-0000-0000-000000000001', 'Klinik Mitra Sehat', 'faskes')
on conflict (id) do nothing;

insert into organization_members (organization_id, profile_id) values
  ('a0000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444'),
  ('a0000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555'),
  ('b0000000-0000-0000-0000-000000000001', '66666666-6666-6666-6666-666666666666')
on conflict do nothing;

-- ── Device models & devices ──────────────────────────────────────
insert into device_models (id, name, category, manufacturer, nie_no, calibration_interval_months) values
  ('d0000000-0000-0000-0000-000000000001', 'GlucoCheck Pro', 'glucometer',    'OmniMed', 'AKL12345678', 12),
  ('d0000000-0000-0000-0000-000000000002', 'OxiPulse O2',    'pulse_oximeter','OmniMed', 'AKL87654321', 12)
on conflict (id) do nothing;

-- V1 punya 2 alat, V2 punya 1 alat (untuk uji isolasi armada)
insert into devices (id, model_id, serial, vendor_id, status) values
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'GC-0001', 'a0000000-0000-0000-0000-000000000001', 'active'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'OX-0001', 'a0000000-0000-0000-0000-000000000001', 'active'),
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'GC-9001', 'a0000000-0000-0000-0000-000000000002', 'active')
on conflict (id) do nothing;

-- ── Kalibrasi + QC + Badge (alat V1 #1 = lulus & ber-badge) ──────
insert into calibrations (id, device_id, lab_id, performed_at, next_due_at, performed_by) values
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', current_date - 30, current_date + 335, 'Lana')
on conflict (id) do nothing;

insert into qc_results (id, calibration_id, result, metrics, notes) values
  ('a1c00000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001',
   'lulus', '{"glucose_bias_pct": 2.1}'::jsonb, 'Dalam toleransi')
on conflict (id) do nothing;

insert into badges (id, device_id, calibration_id, status, expires_at) values
  ('b0000000-0000-0000-0000-0000000000b1', 'e0000000-0000-0000-0000-000000000001',
   'f0000000-0000-0000-0000-000000000001', 'active', current_date + 335)
on conflict (id) do nothing;

-- ── Health readings (Alice punya 2, Bob punya 1) ─────────────────
insert into health_readings (id, customer_id, reading_type, value, unit, source) values
  ('aa100000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'glucose_fasting', '{"glucose_fasting": 95}'::jsonb, 'mg/dL', 'device'),
  ('aa100000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'spo2', '{"spo2": 97}'::jsonb, '%', 'device'),
  ('bb100000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
   'glucose_fasting', '{"glucose_fasting": 140}'::jsonb, 'mg/dL', 'manual')
on conflict (id) do nothing;

-- ── Konsultasi: Carol hanya boleh lihat reading a1 milik Alice ───
insert into consultations (id, customer_id, doctor_id, status, shared_reading_ids) values
  ('cc100000-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   '33333333-3333-3333-3333-333333333333',
   'confirmed',
   array['aa100000-0000-0000-0000-000000000001']::uuid[])
on conflict (id) do nothing;

-- ── Consent (UU PDP — customer-as-data-subject) ─────────────────
insert into consents (customer_id, purpose, status) values
  ('11111111-1111-1111-1111-111111111111', 'qc_and_analysis', 'granted'),
  ('22222222-2222-2222-2222-222222222222', 'qc_and_analysis', 'granted')
on conflict do nothing;
