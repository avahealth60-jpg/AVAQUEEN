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
