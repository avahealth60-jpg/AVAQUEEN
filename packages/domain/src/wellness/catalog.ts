/**
 * AVA Health — Katalog Program Wellness (Fase B).
 *
 * Program adalah DATA terkurasi (bukan logika), agar mudah ditinjau,
 * ditambah, dan ditautkan ke basis pengetahuan. Semua bersifat edukatif;
 * target harian adalah anjuran gaya hidup umum, bukan resep medis.
 */

import type { WellnessProgram } from './types.js';

export const WELLNESS_CATALOG = {
  langkah_harian: {
    code: 'langkah_harian',
    title: 'Langkah harian',
    description: 'Kumpulkan 10.000 langkah setiap hari untuk menjaga tubuh tetap aktif.',
    metric: 'steps',
    dailyTarget: 10000,
    unit: 'langkah',
    cohort: 'umum',
    durationDays: 30,
  },
  tidur_cukup: {
    code: 'tidur_cukup',
    title: 'Tidur cukup',
    description: 'Targetkan 7 jam tidur untuk pemulihan tubuh yang optimal.',
    metric: 'sleep_minutes',
    dailyTarget: 420,
    unit: 'menit',
    cohort: 'umum',
    durationDays: 21,
  },
  gerak_aktif: {
    code: 'gerak_aktif',
    title: 'Gerak aktif',
    description: '30 menit aktivitas fisik sedang setiap hari.',
    metric: 'active_minutes',
    dailyTarget: 30,
    unit: 'menit',
    cohort: 'umum',
    durationDays: 30,
  },
  hidrasi: {
    code: 'hidrasi',
    title: 'Hidrasi cukup',
    description: 'Minum sekitar 2 liter air per hari (catat lewat check-in).',
    metric: 'hydration_ml',
    dailyTarget: 2000,
    unit: 'ml',
    cohort: 'umum',
    durationDays: 21,
  },
  jalan_hipertensi: {
    code: 'jalan_hipertensi',
    title: 'Jalan sahabat tekanan',
    description: 'Jalan kaki rutin 7.000 langkah/hari — kebiasaan ramah tekanan darah.',
    metric: 'steps',
    dailyTarget: 7000,
    unit: 'langkah',
    cohort: 'hipertensi',
    durationDays: 30,
    knowledgeRefs: ['bp_systolic', 'bp_diastolic'],
  },
  kontrol_glikemik: {
    code: 'kontrol_glikemik',
    title: 'Bugar kendali gula',
    description: 'Biasakan jalan ringan setelah makan, target 8.000 langkah/hari.',
    metric: 'steps',
    dailyTarget: 8000,
    unit: 'langkah',
    cohort: 'prediabetes',
    durationDays: 30,
    knowledgeRefs: ['glucose_fasting'],
  },
} as const satisfies Record<string, WellnessProgram>;

export type WellnessProgramCode = keyof typeof WELLNESS_CATALOG;

/** Semua program sebagai array (untuk daftar UI). */
export function listPrograms(): WellnessProgram[] {
  return Object.values(WELLNESS_CATALOG);
}

/** Ambil program by code; null bila tak dikenal (tak menebak). */
export function getProgram(code: string): WellnessProgram | null {
  return (WELLNESS_CATALOG as Record<string, WellnessProgram>)[code] ?? null;
}

/** Metrik mana yang otomatis terlacak dari reading (bukan check-in manual). */
export function isAutoTracked(metric: WellnessProgram['metric']): boolean {
  return metric === 'steps' || metric === 'sleep_minutes' || metric === 'active_minutes';
}
