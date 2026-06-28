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
