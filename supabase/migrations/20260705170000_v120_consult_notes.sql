-- 20260705170000_v120_consult_notes.sql
-- Catatan/resep dokter pasca-konsultasi, tampil ke pasien.
-- Tak perlu RLS baru: pasien sudah membaca baris konsultasinya sendiri
-- ("customer sees own consultations"), dan dokter menulis via
-- "doctor updates assigned consultation".
alter table consultations add column if not exists doctor_note text;
