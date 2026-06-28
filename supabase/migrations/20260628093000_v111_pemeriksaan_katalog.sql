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
  for all using (auth.jwt() ->> 'role' = 'ava_admin')
  with check (auth.jwt() ->> 'role' = 'ava_admin');

drop policy if exists "katalog parameters readable" on parameters;
create policy "katalog parameters readable" on parameters
  for select using (true);
drop policy if exists "katalog parameters admin write" on parameters;
create policy "katalog parameters admin write" on parameters
  for all using (auth.jwt() ->> 'role' = 'ava_admin')
  with check (auth.jwt() ->> 'role' = 'ava_admin');

drop policy if exists "katalog ranges readable" on reference_ranges;
create policy "katalog ranges readable" on reference_ranges
  for select using (true);
drop policy if exists "katalog ranges admin write" on reference_ranges;
create policy "katalog ranges admin write" on reference_ranges
  for all using (auth.jwt() ->> 'role' = 'ava_admin')
  with check (auth.jwt() ->> 'role' = 'ava_admin');

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
