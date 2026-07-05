/**
 * AVA Health — Normalisasi sampel wearable → reading baku (Fase A).
 *
 * Murni, tanpa I/O, tanpa AI, deterministik & teruji. Alur:
 *   1. Petakan nama metrik provider → kunci kanonik AVA (via alias).
 *   2. Konversi satuan ke satuan kanonik bila perlu (fail-fast bila tak dikenal).
 *   3. Metrik KLINIS → evaluasi lewat REFERENCE_CATALOG (triase deterministik).
 *      Metrik GAYA HIDUP → TIDAK ditriase (triage=null). Invarian dijaga di sini.
 */

import type { Triage } from '../types.js';
import { REFERENCE_CATALOG, evaluateMetric } from '../reference-range.js';
import type { WearableMetricSpec, WearableSample, NormalizedReading } from './types.js';
import { WearableNormalizationError } from './types.js';

/* ------------------------------------------------------------------ *
 * REGISTRI METRIK WEARABLE — sumber kebenaran tunggal.
 * Klinis dipetakan ke REFERENCE_CATALOG; gaya hidup tidak ditriase.
 * ------------------------------------------------------------------ */
export const WEARABLE_METRICS = {
  heart_rate: {
    key: 'heart_rate',
    label: 'Detak jantung istirahat',
    unit: 'bpm',
    kind: 'clinical',
    referenceKey: 'heart_rate',
    aliases: ['heartrate', 'heart_rate', 'restingheartrate', 'resting_heart_rate', 'hr', 'bpm'],
  },
  spo2: {
    key: 'spo2',
    label: 'Saturasi oksigen (SpO₂)',
    unit: '%',
    kind: 'clinical',
    referenceKey: 'spo2',
    aliases: ['spo2', 'oxygensaturation', 'oxygen_saturation', 'bloodoxygen', 'blood_oxygen', 'sao2'],
  },
  temperature: {
    key: 'temperature',
    label: 'Suhu tubuh',
    unit: '°C',
    kind: 'clinical',
    referenceKey: 'temperature',
    aliases: ['temperature', 'bodytemperature', 'body_temperature', 'skintemperature', 'skin_temperature'],
  },
  bp_systolic: {
    key: 'bp_systolic',
    label: 'Tekanan darah sistolik',
    unit: 'mmHg',
    kind: 'clinical',
    referenceKey: 'bp_systolic',
    aliases: ['systolic', 'bp_systolic', 'bloodpressuresystolic', 'blood_pressure_systolic'],
  },
  bp_diastolic: {
    key: 'bp_diastolic',
    label: 'Tekanan darah diastolik',
    unit: 'mmHg',
    kind: 'clinical',
    referenceKey: 'bp_diastolic',
    aliases: ['diastolic', 'bp_diastolic', 'bloodpressurediastolic', 'blood_pressure_diastolic'],
  },
  // --- Gaya hidup: TIDAK ditriase (bahan bakar program wellness) ---
  steps: {
    key: 'steps',
    label: 'Langkah',
    unit: 'langkah',
    kind: 'lifestyle',
    aliases: ['steps', 'stepcount', 'step_count', 'totalsteps'],
  },
  sleep_minutes: {
    key: 'sleep_minutes',
    label: 'Durasi tidur',
    unit: 'menit',
    kind: 'lifestyle',
    aliases: ['sleep', 'sleepminutes', 'sleep_minutes', 'sleepduration', 'sleep_duration', 'sleepsession'],
  },
  active_calories: {
    key: 'active_calories',
    label: 'Kalori aktif',
    unit: 'kkal',
    kind: 'lifestyle',
    aliases: ['activecalories', 'active_calories', 'activeenergyburned', 'calories', 'kcal'],
  },
  hrv: {
    key: 'hrv',
    label: 'Variabilitas detak jantung (HRV)',
    unit: 'ms',
    kind: 'lifestyle',
    aliases: ['hrv', 'heartratevariability', 'heart_rate_variability', 'sdnn', 'rmssd'],
  },
  distance_meters: {
    key: 'distance_meters',
    label: 'Jarak tempuh',
    unit: 'm',
    kind: 'lifestyle',
    aliases: ['distance', 'distancemeters', 'distance_meters', 'totaldistance'],
  },
} as const satisfies Record<string, WearableMetricSpec>;

export type WearableMetricKey = keyof typeof WEARABLE_METRICS;

/** Peta alias (lowercase) → kunci kanonik, dibangun sekali. */
const ALIAS_INDEX: Map<string, WearableMetricKey> = (() => {
  const idx = new Map<string, WearableMetricKey>();
  for (const spec of Object.values(WEARABLE_METRICS)) {
    for (const alias of spec.aliases) {
      const norm = alias.toLowerCase().replace(/[\s_-]/g, '');
      idx.set(norm, spec.key as WearableMetricKey);
    }
  }
  return idx;
})();

/** Petakan nama metrik provider apa adanya → spec kanonik AVA (atau null). */
export function resolveMetric(rawMetric: string): WearableMetricSpec | null {
  const norm = rawMetric.toLowerCase().replace(/[\s_-]/g, '');
  const key = ALIAS_INDEX.get(norm);
  return key ? WEARABLE_METRICS[key] : null;
}

/**
 * Konversi nilai ke satuan kanonik. Hanya konversi yang eksplisit & aman.
 * Satuan tak dikenal untuk metrik bersatuan → lempar (fail-fast, jujur).
 */
export function toCanonicalUnit(
  spec: WearableMetricSpec,
  value: number,
  rawUnit?: string | null,
): number {
  const canonical = spec.unit;
  // Metrik tak bersatuan atau satuan sudah cocok / tak disebutkan → apa adanya.
  if (canonical == null) return value;
  if (rawUnit == null || rawUnit === '') return value;

  const from = rawUnit.trim().toLowerCase();
  const to = canonical.toLowerCase();
  if (from === to) return value;

  // Suhu: Fahrenheit → Celsius.
  if (to === '°c' && (from === '°f' || from === 'f' || from === 'fahrenheit')) {
    return (value - 32) * (5 / 9);
  }
  // Tidur: jam → menit.
  if (to === 'menit' && (from === 'jam' || from === 'h' || from === 'hour' || from === 'hours')) {
    return value * 60;
  }
  // Jarak: km → meter.
  if (to === 'm' && (from === 'km' || from === 'kilometer' || from === 'kilometers')) {
    return value * 1000;
  }
  // Satuan setara yang boleh dianggap sama (mis. bpm/count-per-minute, %/percent).
  const EQUIVALENT: Record<string, string[]> = {
    bpm: ['count/min', 'countperminute', 'beatsperminute', '/min'],
    '%': ['percent', 'pct'],
    langkah: ['count', 'steps'],
    kkal: ['kcal', 'cal', 'calories'],
    ms: ['millisecond', 'milliseconds'],
  };
  if (EQUIVALENT[to]?.includes(from)) return value;

  throw new WearableNormalizationError(
    `Satuan "${rawUnit}" tidak dikenal untuk metrik "${spec.key}" (kanonik: ${canonical}).`,
  );
}

/**
 * Normalisasi satu sampel wearable → reading baku.
 * @returns NormalizedReading, atau `null` bila metrik tidak dikenal AVA
 *          (di-skip dengan jujur alih-alih menebak).
 */
export function normalizeWearableSample(sample: WearableSample): NormalizedReading | null {
  if (!Number.isFinite(sample.value)) {
    throw new WearableNormalizationError(
      `Metrik "${sample.metric}": nilai harus angka berhingga, diterima ${sample.value}.`,
    );
  }
  const spec = resolveMetric(sample.metric);
  if (!spec) return null;

  const value = toCanonicalUnit(spec, sample.value, sample.unit);

  let triage: Triage | null = null;
  let reason: string;

  if (spec.kind === 'clinical' && spec.referenceKey) {
    const evaluation = evaluateMetric(REFERENCE_CATALOG[spec.referenceKey], value);
    triage = evaluation.triage;
    reason =
      triage === 'normal'
        ? 'Berada dalam rentang yang umum dianggap normal.'
        : triage === 'perhatian'
          ? 'Di luar rentang normal — perhatikan & pantau.'
          : 'Nilai di luar ambang aman — sebaiknya segera konsultasi.';
  } else {
    // INVARIAN: metrik gaya hidup tidak pernah ditriase.
    reason = 'Metrik gaya hidup untuk pemantauan tren, bukan penilaian klinis.';
  }

  const normalized: NormalizedReading = {
    readingType: spec.key,
    label: spec.label,
    value,
    unit: spec.unit,
    source: sample.source,
    takenAt: sample.takenAt,
    deviceModel: sample.deviceModel ?? null,
    kind: spec.kind,
    triage,
    reason,
  };

  // Sabuk pengaman ganda: metrik gaya hidup tak boleh menghasilkan triase.
  if (normalized.kind === 'lifestyle' && normalized.triage !== null) {
    throw new WearableNormalizationError(
      `Invarian dilanggar: metrik gaya hidup "${spec.key}" tidak boleh ditriase.`,
    );
  }
  return normalized;
}

/** Normalisasi banyak sampel; metrik tak dikenal di-skip (bukan error). */
export function normalizeWearableBatch(samples: readonly WearableSample[]): NormalizedReading[] {
  const out: NormalizedReading[] = [];
  for (const s of samples) {
    const n = normalizeWearableSample(s);
    if (n) out.push(n);
  }
  return out;
}

/** Apakah reading ini perlu dibuatkan `analysis_results` (hanya klinis bertriase). */
export function shouldCreateAnalysis(n: NormalizedReading): boolean {
  return n.kind === 'clinical' && n.triage !== null;
}
