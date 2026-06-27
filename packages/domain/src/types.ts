/**
 * Tipe domain inti AVA Health.
 * Nilai-nilai ini SENGAJA dicocokkan dengan ENUM di skema Postgres
 * (supabase/migrations) supaya satu sumber kebenaran lintas lapisan.
 */

/** Tingkat triase edukatif — BUKAN diagnosis. Selalu disertai disclaimer. */
export type Triage = 'normal' | 'perhatian' | 'segera';

/** Hasil quality control kalibrasi alat. */
export type QcResult = 'lulus' | 'perlu_tinjau' | 'gagal';

/** Status badge "AVA Verified" untuk sebuah unit alat. */
export type BadgeStatus = 'active' | 'expired';

/** Status pengingat kalibrasi (dipakai cron schedule-reminders). */
export type CalibrationReminderStatus = 'ok' | 'due_soon' | 'overdue';

/** Urutan keparahan triase, kecil = ringan. Dipakai untuk ambil yang terburuk. */
export const TRIAGE_SEVERITY: Record<Triage, number> = {
  normal: 0,
  perhatian: 1,
  segera: 2,
};

/** Disclaimer wajib yang menempel pada SETIAP output analisis (UU PDP + posisi SaMD edukatif). */
export const EDUCATIONAL_DISCLAIMER =
  'Informasi ini bersifat edukatif untuk membantu Anda memahami hasil pemeriksaan, ' +
  'dan BUKAN diagnosis medis. Untuk kepastian dan tindak lanjut, konsultasikan dengan tenaga kesehatan berlisensi.';
