-- ============================================================================
-- AVA Health — Migrasi V1.1.2 : Seed Basis Pengetahuan (CONTOH)
-- ----------------------------------------------------------------------------
-- Idempoten: upsert on (parameter_id, triage).
-- KEJUJURAN MEDIS: konten di bawah CONTOH untuk pengembangan. Sebelum produksi
-- WAJIB divalidasi & ditandatangani klinisi; ganti signed_off_by & source.
-- Contoh ini mengikuti format Blueprint §04 (gula darah puasa).
-- ============================================================================

insert into knowledge_entries
  (parameter_id, triage, artinya, penyebab, saran, kapan_ke_dokter, source, signed_off_by, signed_off_at)
values
  (
    (select id from parameters where code='glukosa_puasa'), 'normal',
    'Nilai gula darah puasamu berada dalam rentang yang umum dianggap normal (≈70–99 mg/dL). Ini gambaran satu waktu, bukan jaminan, jadi pemantauan rutin tetap baik.',
    'Pola makan seimbang, aktivitas fisik teratur, dan tidur cukup membantu menjaga nilai ini.',
    'Pertahankan kebiasaan sehat; periksa berkala sesuai anjuran tenaga medis.',
    'Bila muncul gejala seperti sering haus berlebihan atau sering buang air kecil, konsultasikan.',
    'Seed V1.1.2 (contoh)', 'BELUM DITANDATANGANI — placeholder', '2026-06-28'
  ),
  (
    (select id from parameters where code='glukosa_puasa'), 'perhatian',
    'Nilaimu di atas rentang puasa yang umum dianggap normal (≈70–99 mg/dL) dan masuk kisaran yang sering disebut "waspada". Ini gambaran satu waktu, bukan vonis.',
    'Bisa dipengaruhi makan/minum manis sebelum tes, kurang tidur, stres, kurang gerak, atau pola makan beberapa hari terakhir. Penyebab pastimu hanya bisa dipastikan tenaga medis.',
    'Ulangi pemeriksaan puasa di hari lain untuk pola yang lebih andal; kurangi gula sederhana; tambah aktivitas fisik ringan. Pertimbangkan cek HbA1c.',
    'Bila berulang tinggi, atau disertai sering haus, sering buang air kecil, lelah berlebihan, atau pandangan kabur — konsultasikan.',
    'Seed V1.1.2 (contoh)', 'BELUM DITANDATANGANI — placeholder', '2026-06-28'
  ),
  (
    (select id from parameters where code='glukosa_puasa'), 'segera',
    'Nilaimu cukup jauh di atas rentang puasa normal dan sebaiknya tidak ditunda untuk ditindaklanjuti. Ini tetap gambaran satu waktu, bukan diagnosis.',
    'Beberapa faktor sementara bisa menaikkan angka, tetapi nilai setinggi ini perlu konfirmasi tenaga medis untuk memahami penyebabnya.',
    'Sebaiknya segera rencanakan konsultasi. Sementara itu, hindari konsumsi gula berlebih dan tetap terhidrasi.',
    'Segera konsultasikan, terlebih bila disertai gejala seperti sangat haus, sering buang air kecil, mual, atau lemas berat. AVA bisa menghubungkanmu ke dokter.',
    'Seed V1.1.2 (contoh)', 'BELUM DITANDATANGANI — placeholder', '2026-06-28'
  )
on conflict (parameter_id, triage) do update
  set artinya = excluded.artinya, penyebab = excluded.penyebab, saran = excluded.saran,
      kapan_ke_dokter = excluded.kapan_ke_dokter, source = excluded.source,
      signed_off_by = excluded.signed_off_by, signed_off_at = excluded.signed_off_at;
