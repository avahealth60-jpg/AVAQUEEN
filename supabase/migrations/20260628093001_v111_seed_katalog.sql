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
