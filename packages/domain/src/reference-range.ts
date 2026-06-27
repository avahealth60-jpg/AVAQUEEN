/**
 * Mesin triase berbasis reference-range — DETERMINISTIK & DAPAT DIAUDIT.
 *
 * Prinsip (sesuai blueprint §4.4 ai-analyze):
 *   - Keputusan triase TIDAK pernah datang dari LLM. Ia datang dari rule
 *     berbasis ambang yang tersimpan sebagai data → auditable, dapat diuji,
 *     dapat dikonfigurasi klinisi lewat AVA Admin Console.
 *   - LLM hanya dipakai untuk MENERJEMAHKAN hasil triase menjadi kalimat
 *     edukatif (lihat supabase/functions/ai-analyze). Itu menjaga posisi SaMD
 *     "AI sebagai penerjemah, bukan pendiagnosis".
 *
 * PENTING: Ambang di bawah adalah nilai rujukan dewasa umum untuk keperluan
 * EDUKATIF dan WAJIB ditinjau & ditandatangani tenaga klinis sebelum produksi.
 * Mereka sengaja dipisah sebagai DATA agar mudah ditinjau/diubah tanpa menyentuh logika.
 */

import type { Triage } from './types.js';
import { TRIAGE_SEVERITY } from './types.js';

/** Satu pita nilai: [min, max) memetakan ke satu tingkat triase. */
export interface Band {
  /** Batas bawah inklusif. Gunakan -Infinity untuk tak terbatas. */
  readonly min: number;
  /** Batas atas eksklusif. Gunakan Infinity untuk tak terbatas. */
  readonly max: number;
  readonly triage: Triage;
}

/** Spesifikasi satu metrik terukur (mis. glukosa puasa). */
export interface MetricSpec {
  readonly key: string;
  readonly label: string;
  readonly unit: string;
  /** Pita harus terurut, tidak tumpang tindih, dan menutup seluruh garis bilangan. */
  readonly bands: readonly Band[];
}

export interface MetricEvaluation {
  readonly key: string;
  readonly value: number;
  readonly unit: string;
  readonly triage: Triage;
}

export class ReferenceRangeError extends Error {}

/**
 * Validasi bahwa pita menutup (-Infinity, Infinity) tanpa celah/tumpang tindih.
 * Dipanggil saat memuat spec (fail-fast) supaya config rusak ketahuan saat tes,
 * bukan saat pasien menerima triase salah.
 */
export function assertBandsValid(spec: MetricSpec): void {
  const { bands, key } = spec;
  if (bands.length === 0) {
    throw new ReferenceRangeError(`Metrik "${key}" tidak punya pita.`);
  }
  const sorted = [...bands].sort((a, b) => a.min - b.min);
  if (sorted[0]!.min !== -Infinity) {
    throw new ReferenceRangeError(`Metrik "${key}": pita pertama harus mulai dari -Infinity.`);
  }
  if (sorted[sorted.length - 1]!.max !== Infinity) {
    throw new ReferenceRangeError(`Metrik "${key}": pita terakhir harus berakhir di Infinity.`);
  }
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i]!;
    if (b.min >= b.max) {
      throw new ReferenceRangeError(`Metrik "${key}": pita [${b.min}, ${b.max}) tidak valid (min >= max).`);
    }
    if (i > 0) {
      const prev = sorted[i - 1]!;
      if (b.min !== prev.max) {
        throw new ReferenceRangeError(
          `Metrik "${key}": ada celah/tumpang tindih antara ${prev.max} dan ${b.min}.`,
        );
      }
    }
  }
}

/** Cari triase untuk satu nilai. Lempar jika nilai bukan angka berhingga. */
export function evaluateMetric(spec: MetricSpec, value: number): MetricEvaluation {
  if (!Number.isFinite(value)) {
    throw new ReferenceRangeError(`Metrik "${spec.key}": nilai harus angka berhingga, diterima ${value}.`);
  }
  const band = spec.bands.find((b) => value >= b.min && value < b.max);
  if (!band) {
    // Seharusnya mustahil jika assertBandsValid lulus, tapi defensif.
    throw new ReferenceRangeError(`Metrik "${spec.key}": nilai ${value} tidak masuk pita mana pun.`);
  }
  return { key: spec.key, value, unit: spec.unit, triage: band.triage };
}

/** Ambil triase paling parah dari beberapa evaluasi (mis. sistolik + diastolik). */
export function worstTriage(triages: readonly Triage[]): Triage {
  if (triages.length === 0) return 'normal';
  return triages.reduce((acc, t) => (TRIAGE_SEVERITY[t] > TRIAGE_SEVERITY[acc] ? t : acc), 'normal' as Triage);
}

/* ------------------------------------------------------------------ *
 * KATALOG REFERENCE-RANGE (nilai rujukan dewasa umum, EDUKATIF).
 * Sumber kebenaran tunggal; ditinjau klinisi lewat AVA Admin Console.
 * ------------------------------------------------------------------ */

export const REFERENCE_CATALOG = {
  glucose_fasting: {
    key: 'glucose_fasting',
    label: 'Gula darah puasa',
    unit: 'mg/dL',
    bands: [
      { min: -Infinity, max: 54, triage: 'segera' }, // hipoglikemia berat
      { min: 54, max: 70, triage: 'perhatian' },
      { min: 70, max: 100, triage: 'normal' },
      { min: 100, max: 126, triage: 'perhatian' }, // prediabetes range
      { min: 126, max: 250, triage: 'perhatian' },
      { min: 250, max: Infinity, triage: 'segera' },
    ],
  },
  spo2: {
    key: 'spo2',
    label: 'Saturasi oksigen (SpO₂)',
    unit: '%',
    bands: [
      { min: -Infinity, max: 90, triage: 'segera' },
      { min: 90, max: 95, triage: 'perhatian' },
      { min: 95, max: Infinity, triage: 'normal' },
    ],
  },
  heart_rate: {
    key: 'heart_rate',
    label: 'Detak jantung istirahat',
    unit: 'bpm',
    bands: [
      { min: -Infinity, max: 40, triage: 'segera' },
      { min: 40, max: 60, triage: 'perhatian' },
      { min: 60, max: 100, triage: 'normal' },
      { min: 100, max: 130, triage: 'perhatian' },
      { min: 130, max: Infinity, triage: 'segera' },
    ],
  },
  temperature: {
    key: 'temperature',
    label: 'Suhu tubuh',
    unit: '°C',
    bands: [
      { min: -Infinity, max: 35, triage: 'segera' }, // hipotermia
      { min: 35, max: 37.5, triage: 'normal' },
      { min: 37.5, max: 39, triage: 'perhatian' },
      { min: 39, max: Infinity, triage: 'segera' },
    ],
  },
  bp_systolic: {
    key: 'bp_systolic',
    label: 'Tekanan darah sistolik',
    unit: 'mmHg',
    bands: [
      { min: -Infinity, max: 90, triage: 'perhatian' }, // hipotensi
      { min: 90, max: 120, triage: 'normal' },
      { min: 120, max: 180, triage: 'perhatian' },
      { min: 180, max: Infinity, triage: 'segera' }, // krisis hipertensi
    ],
  },
  bp_diastolic: {
    key: 'bp_diastolic',
    label: 'Tekanan darah diastolik',
    unit: 'mmHg',
    bands: [
      { min: -Infinity, max: 60, triage: 'perhatian' },
      { min: 60, max: 80, triage: 'normal' },
      { min: 80, max: 120, triage: 'perhatian' },
      { min: 120, max: Infinity, triage: 'segera' },
    ],
  },
} as const satisfies Record<string, MetricSpec>;

export type ReferenceKey = keyof typeof REFERENCE_CATALOG;

/** Evaluasi tekanan darah (komposit sistolik/diastolik) → triase terburuk. */
export function evaluateBloodPressure(systolic: number, diastolic: number): MetricEvaluation & {
  systolic: number;
  diastolic: number;
} {
  const s = evaluateMetric(REFERENCE_CATALOG.bp_systolic, systolic);
  const d = evaluateMetric(REFERENCE_CATALOG.bp_diastolic, diastolic);
  return {
    key: 'blood_pressure',
    value: systolic,
    unit: 'mmHg',
    systolic,
    diastolic,
    triage: worstTriage([s.triage, d.triage]),
  };
}
