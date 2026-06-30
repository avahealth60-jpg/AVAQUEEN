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
