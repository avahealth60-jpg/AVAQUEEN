/**
 * AVA Health — Domain Notifikasi & Nudge (Fase C).
 *
 * Murni & deterministik. MENYUSUN teks nudge/alert dari keadaan yang sudah
 * dihitung di tempat lain (ringkasan wellness, triase tersimpan). Ia TIDAK
 * menghitung ulang triase dan TIDAK memanggil AI.
 *
 * PRINSIP:
 *   - Nudge wellness bernada HANGAT & tidak menghakimi (kebiasaan, bukan klinis).
 *   - Alert pendamping merujuk triase yang SUDAH deterministik; selalu edukatif,
 *     tidak pernah "diagnosis".
 */

import type { Triage } from '../types.js';

export type NudgeKind = 'wellness_achieved' | 'wellness_on_track' | 'wellness_restart';
export type NudgeTone = 'celebrate' | 'encourage' | 'info';

export interface Nudge {
  kind: NudgeKind;
  tone: NudgeTone;
  title: string;
  body: string;
}

/** Ringkasan minimal satu program (subset ProgressSummary) untuk menyusun nudge. */
export interface WellnessNudgeInput {
  title: string;
  unit: string;
  target: number;
  latest: number;
  status: 'achieved' | 'on_track' | 'behind';
  streak: number;
}

function fmt(n: number): string {
  return n.toLocaleString('id-ID');
}

/** Susun satu nudge untuk sebuah program aktif. */
export function wellnessNudge(p: WellnessNudgeInput): Nudge {
  if (p.status === 'achieved') {
    return {
      kind: 'wellness_achieved',
      tone: 'celebrate',
      title: `🎉 ${p.title} tercapai!`,
      body: p.streak > 1
        ? `Mantap! Sudah ${p.streak} hari beruntun. Pertahankan ritmenya.`
        : 'Target hari ini tercapai. Terus jaga kebiasaan baik ini!',
    };
  }
  if (p.status === 'on_track') {
    const sisa = Math.max(0, p.target - p.latest);
    return {
      kind: 'wellness_on_track',
      tone: 'encourage',
      title: `Sedikit lagi: ${p.title}`,
      body: `Tinggal ${fmt(sisa)} ${p.unit} lagi menuju target ${fmt(p.target)} ${p.unit}. Kamu bisa!`,
    };
  }
  return {
    kind: 'wellness_restart',
    tone: 'info',
    title: `Yuk lanjut: ${p.title}`,
    body: `Belum ada progres berarti hari ini. Langkah kecil pun berarti — mulai sekarang.`,
  };
}

/**
 * Susun daftar nudge dari beberapa program aktif. Diprioritaskan yang paling
 * mendorong aksi (on_track dulu, lalu restart, lalu perayaan) & dibatasi `max`.
 */
export function wellnessNudges(programs: readonly WellnessNudgeInput[], max = 3): Nudge[] {
  const order: Record<WellnessNudgeInput['status'], number> = { on_track: 0, behind: 1, achieved: 2 };
  return [...programs]
    .sort((a, b) => order[a.status] - order[b.status])
    .slice(0, max)
    .map(wellnessNudge);
}

export interface CaregiverAlert {
  title: string;
  body: string;
}

/** Ringkasan reading pasien untuk alert pendamping. */
export interface AlertReadingInput {
  patientName: string;
  label: string; // mis. 'Saturasi oksigen (SpO₂)'
  display: string; // nilai siap-tampil, mis. '88'
  unit: string;
  triage: Triage;
}

/**
 * Susun alert pendamping dari sebuah reading. Mengembalikan null bila triase
 * 'normal' (tak perlu mengganggu). Selalu edukatif, bukan diagnosis.
 */
export function caregiverAlertFor(r: AlertReadingInput): CaregiverAlert | null {
  if (r.triage === 'normal') return null;
  const urgensi = r.triage === 'segera' ? 'perlu segera diperiksa' : 'perlu perhatian';
  return {
    title: `${r.patientName}: ${r.label} ${urgensi}`,
    body:
      `Hasil terbaru ${r.label} adalah ${r.display} ${r.unit}. Ini info edukatif ` +
      `untuk membantu kamu mendampingi, bukan diagnosis. Ajak berkonsultasi dengan tenaga kesehatan bila perlu.`,
  };
}
