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

/* ------------------------------------------------------------------ *
 * WEARABLE (Fase A) — cermin normalisasi @ava/domain/wearable.
 * SUMBER KEBENARAN: packages/domain/src/wearable. Konsistensi dijaga
 * oleh parity test (supabase/tests/parity.test.mjs).
 * ------------------------------------------------------------------ */

export type MetricKind = 'clinical' | 'lifestyle';

interface EdgeWearableSpec {
  key: string;
  unit: string | null;
  kind: MetricKind;
  bands?: { min: number; max: number; t: Triage }[];
  aliases: string[];
}

const WEARABLE_METRICS_EDGE: EdgeWearableSpec[] = [
  {
    key: 'heart_rate', unit: 'bpm', kind: 'clinical',
    aliases: ['heartrate', 'heart_rate', 'restingheartrate', 'resting_heart_rate', 'hr', 'bpm'],
    bands: [
      { min: -Infinity, max: 40, t: 'segera' },
      { min: 40, max: 60, t: 'perhatian' },
      { min: 60, max: 100, t: 'normal' },
      { min: 100, max: 130, t: 'perhatian' },
      { min: 130, max: Infinity, t: 'segera' },
    ],
  },
  {
    key: 'spo2', unit: '%', kind: 'clinical',
    aliases: ['spo2', 'oxygensaturation', 'oxygen_saturation', 'bloodoxygen', 'blood_oxygen', 'sao2'],
    bands: [
      { min: -Infinity, max: 90, t: 'segera' },
      { min: 90, max: 95, t: 'perhatian' },
      { min: 95, max: Infinity, t: 'normal' },
    ],
  },
  {
    key: 'temperature', unit: '°C', kind: 'clinical',
    aliases: ['temperature', 'bodytemperature', 'body_temperature', 'skintemperature', 'skin_temperature'],
    bands: [
      { min: -Infinity, max: 35, t: 'segera' },
      { min: 35, max: 37.5, t: 'normal' },
      { min: 37.5, max: 39, t: 'perhatian' },
      { min: 39, max: Infinity, t: 'segera' },
    ],
  },
  {
    key: 'bp_systolic', unit: 'mmHg', kind: 'clinical',
    aliases: ['systolic', 'bp_systolic', 'bloodpressuresystolic', 'blood_pressure_systolic'],
    bands: [
      { min: -Infinity, max: 90, t: 'perhatian' },
      { min: 90, max: 120, t: 'normal' },
      { min: 120, max: 180, t: 'perhatian' },
      { min: 180, max: Infinity, t: 'segera' },
    ],
  },
  {
    key: 'bp_diastolic', unit: 'mmHg', kind: 'clinical',
    aliases: ['diastolic', 'bp_diastolic', 'bloodpressurediastolic', 'blood_pressure_diastolic'],
    bands: [
      { min: -Infinity, max: 60, t: 'perhatian' },
      { min: 60, max: 80, t: 'normal' },
      { min: 80, max: 120, t: 'perhatian' },
      { min: 120, max: Infinity, t: 'segera' },
    ],
  },
  { key: 'steps', unit: 'langkah', kind: 'lifestyle', aliases: ['steps', 'stepcount', 'step_count', 'totalsteps'] },
  { key: 'sleep_minutes', unit: 'menit', kind: 'lifestyle', aliases: ['sleep', 'sleepminutes', 'sleep_minutes', 'sleepduration', 'sleep_duration', 'sleepsession'] },
  { key: 'active_calories', unit: 'kkal', kind: 'lifestyle', aliases: ['activecalories', 'active_calories', 'activeenergyburned', 'calories', 'kcal'] },
  { key: 'hrv', unit: 'ms', kind: 'lifestyle', aliases: ['hrv', 'heartratevariability', 'heart_rate_variability', 'sdnn', 'rmssd'] },
  { key: 'distance_meters', unit: 'm', kind: 'lifestyle', aliases: ['distance', 'distancemeters', 'distance_meters', 'totaldistance'] },
];

const EDGE_ALIAS_INDEX = new Map<string, EdgeWearableSpec>();
for (const spec of WEARABLE_METRICS_EDGE) {
  for (const a of spec.aliases) EDGE_ALIAS_INDEX.set(a.toLowerCase().replace(/[\s_-]/g, ''), spec);
}

export function resolveWearableMetric(rawMetric: string): EdgeWearableSpec | null {
  return EDGE_ALIAS_INDEX.get(rawMetric.toLowerCase().replace(/[\s_-]/g, '')) ?? null;
}

export function toCanonicalUnitEdge(spec: EdgeWearableSpec, value: number, rawUnit?: string | null): number {
  const canonical = spec.unit;
  if (canonical == null || rawUnit == null || rawUnit === '') return value;
  const from = rawUnit.trim().toLowerCase();
  const to = canonical.toLowerCase();
  if (from === to) return value;
  if (to === '°c' && (from === '°f' || from === 'f' || from === 'fahrenheit')) return (value - 32) * (5 / 9);
  if (to === 'menit' && (from === 'jam' || from === 'h' || from === 'hour' || from === 'hours')) return value * 60;
  if (to === 'm' && (from === 'km' || from === 'kilometer' || from === 'kilometers')) return value * 1000;
  const EQUIVALENT: Record<string, string[]> = {
    bpm: ['count/min', 'countperminute', 'beatsperminute', '/min'],
    '%': ['percent', 'pct'],
    langkah: ['count', 'steps'],
    kkal: ['kcal', 'cal', 'calories'],
    ms: ['millisecond', 'milliseconds'],
  };
  if (EQUIVALENT[to]?.includes(from)) return value;
  throw new Error(`Satuan "${rawUnit}" tidak dikenal untuk metrik "${spec.key}".`);
}

export interface EdgeNormalizedReading {
  readingType: string;
  value: number;
  unit: string | null;
  kind: MetricKind;
  triage: Triage | null;
}

export function normalizeWearableSample(
  sample: { metric: string; value: number; unit?: string | null },
): EdgeNormalizedReading | null {
  if (!Number.isFinite(sample.value)) throw new Error(`Nilai wearable harus angka berhingga.`);
  const spec = resolveWearableMetric(sample.metric);
  if (!spec) return null;
  const value = toCanonicalUnitEdge(spec, sample.value, sample.unit);
  let triage: Triage | null = null;
  if (spec.kind === 'clinical' && spec.bands) {
    triage = spec.bands.find((b) => value >= b.min && value < b.max)?.t ?? 'perhatian';
  }
  return { readingType: spec.key, value, unit: spec.unit, kind: spec.kind, triage };
}

/* ------------------------------------------------------------------ *
 * ALERT PENDAMPING (Fase C) — cermin @ava/domain/notify.caregiverAlertFor.
 * ------------------------------------------------------------------ */
export interface CaregiverAlert { title: string; body: string; }
export function caregiverAlertFor(r: {
  patientName: string; label: string; display: string; unit: string; triage: Triage;
}): CaregiverAlert | null {
  if (r.triage === 'normal') return null;
  const urgensi = r.triage === 'segera' ? 'perlu segera diperiksa' : 'perlu perhatian';
  return {
    title: `${r.patientName}: ${r.label} ${urgensi}`,
    body:
      `Hasil terbaru ${r.label} adalah ${r.display} ${r.unit}. Ini info edukatif ` +
      `untuk membantu kamu mendampingi, bukan diagnosis. Ajak berkonsultasi dengan tenaga kesehatan bila perlu.`,
  };
}
