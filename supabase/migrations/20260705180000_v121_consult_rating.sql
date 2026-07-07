-- 20260705180000_v121_consult_rating.sql
-- Rating pasien untuk konsultasi (1–5) + komentar opsional.
-- Tak perlu RLS baru: pasien menulis via "customer updates own consultation",
-- dokter membaca via "doctor sees assigned consultations".
alter table consultations add column if not exists rating int check (rating between 1 and 5);
alter table consultations add column if not exists rating_comment text;
