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
