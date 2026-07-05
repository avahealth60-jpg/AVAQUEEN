/**
 * AVA Health — Domain Wellness Korporat / B2B.
 *
 * Firewall privasi: pemberi kerja HANYA boleh melihat AGREGAT teranonimkan,
 * tidak pernah data kesehatan individu. Logika k-anonimitas & pembandingan
 * (banding) kasar hidup di sini (murni & teruji); DB menegakkannya lewat
 * fungsi agregat (employer_wellness_summary) yang mencerminkan ambang ini.
 */

/** Ambang k-anonimitas: agregat disembunyikan bila peserta < K. */
export const K_ANONYMITY_MIN = 5;

export class CorporateError extends Error {}

/** Apakah agregat harus disembunyikan (peserta terlalu sedikit → bisa dikenali). */
export function shouldSuppress(participants: number, k: number = K_ANONYMITY_MIN): boolean {
  if (!Number.isInteger(participants) || participants < 0) {
    throw new CorporateError('participants harus bilangan bulat >= 0.');
  }
  return participants < k;
}

/** Tingkat partisipasi wellness (0..100), null bila disembunyikan. */
export function participationRate(
  activeWellness: number,
  participants: number,
  k: number = K_ANONYMITY_MIN,
): number | null {
  if (shouldSuppress(participants, k)) return null;
  if (participants === 0) return 0;
  return Math.round((activeWellness / participants) * 100);
}

export type StepsBand = '<5k' | '5–8k' | '8–10k' | '≥10k';

/** Bandingkan rata-rata langkah ke pita kasar (privasi: sembunyikan nilai persis). */
export function stepsBand(avgSteps: number): StepsBand {
  if (!Number.isFinite(avgSteps) || avgSteps < 0) throw new CorporateError('avgSteps harus >= 0.');
  if (avgSteps < 5000) return '<5k';
  if (avgSteps < 8000) return '5–8k';
  if (avgSteps < 10000) return '8–10k';
  return '≥10k';
}

export interface EmployerAggregate {
  participants: number;
  suppressed: boolean;
  activeWellnessRate: number | null; // %
}

/** Rakit ringkasan agregat dari hitungan mentah, menerapkan k-anonimitas. */
export function buildEmployerAggregate(
  participants: number,
  activeWellness: number,
  k: number = K_ANONYMITY_MIN,
): EmployerAggregate {
  const suppressed = shouldSuppress(participants, k);
  return {
    participants,
    suppressed,
    activeWellnessRate: suppressed ? null : participationRate(activeWellness, participants, k),
  };
}
