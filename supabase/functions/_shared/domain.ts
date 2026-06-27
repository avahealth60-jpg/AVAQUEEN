/**
 * Cermin Deno-compatible dari keputusan inti @ava/domain agar Edge Function
 * dapat dideploy mandiri. SUMBER KEBENARAN tetap packages/domain (teruji 38 tes);
 * di CI, file ini diverifikasi konsisten via test parity (lihat catatan README).
 */

export type QcResult = 'lulus' | 'perlu_tinjau' | 'gagal';
export type Triage = 'normal' | 'perhatian' | 'segera';

export const EDUCATIONAL_DISCLAIMER =
  'Informasi ini bersifat edukatif untuk membantu Anda memahami hasil pemeriksaan, ' +
  'dan BUKAN diagnosis medis. Untuk kepastian dan tindak lanjut, konsultasikan dengan tenaga kesehatan berlisensi.';

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

export function decideBadge(qc: QcResult, performedAt: Date, intervalMonths: number) {
  if (qc !== 'lulus') {
    return { issued: false as const, reason: `QC "${qc}" tidak lolos — badge tidak diterbitkan.` };
  }
  return { issued: true as const, expiresAt: addMonths(performedAt, intervalMonths) };
}
