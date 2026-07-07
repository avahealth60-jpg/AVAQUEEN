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
