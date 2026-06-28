/**
 * AVA Health — Mesin Triase Deterministik (V1.1.1)
 *
 * Murni, tanpa I/O, tanpa AI. Urutan keputusan tetap & teruji:
 *   1. ambang kritis (urgentLow/urgentHigh) -> 'segera'
 *   2. di dalam rentang normal -> 'normal'
 *   3. di luar rentang normal (tapi belum kritis) -> 'perhatian'
 *   4. tanpa rentang -> 'normal' + ditandai hasRange=false (tak bisa dinilai)
 *
 * Output ini yang dipakai UI (termasuk diberikan ke calibrationScale sebagai
 * `status` eksplisit) — sehingga tidak ada dua implementasi triase yang bisa
 * menyimpang.
 */
import type { ReferenceRange, EvalResult, TriageLevel, CheckupValue } from './types.js';

export function evaluateParameter(
  value: number,
  range?: ReferenceRange | null,
): EvalResult {
  if (!Number.isFinite(value)) {
    throw new Error('Nilai pemeriksaan harus berupa angka berhingga');
  }
  if (!range) {
    return { triage: 'normal', reason: 'Belum ada rentang rujukan untuk parameter ini.', hasRange: false };
  }

  // 1. Ambang kritis
  if (range.urgentLow != null && value < range.urgentLow) {
    return { triage: 'segera', reason: 'Nilai jauh di bawah ambang aman.', hasRange: true };
  }
  if (range.urgentHigh != null && value > range.urgentHigh) {
    return { triage: 'segera', reason: 'Nilai jauh di atas ambang aman.', hasRange: true };
  }

  // 2 & 3. Rentang normal
  if (range.normalMin != null && range.normalMax != null) {
    if (value >= range.normalMin && value <= range.normalMax) {
      return { triage: 'normal', reason: 'Berada dalam rentang yang umum dianggap normal.', hasRange: true };
    }
    const reason =
      value < range.normalMin
        ? 'Sedikit di bawah rentang normal.'
        : 'Sedikit di atas rentang normal.';
    return { triage: 'perhatian', reason, hasRange: true };
  }

  // 4. Hanya punya skala, tanpa pita normal
  return { triage: 'normal', reason: 'Belum ada pita normal yang ditetapkan.', hasRange: false };
}

/** Peringkat keparahan untuk roll-up. Konsisten dengan trigger SQL. */
const RANK: Record<TriageLevel, number> = { normal: 0, perhatian: 1, segera: 2 };

/** Ringkasan sesi: ambil triase terburuk dari seluruh parameter. */
export function summarizeCheckup(levels: TriageLevel[]): TriageLevel {
  if (levels.length === 0) return 'normal';
  return levels.reduce((worst, cur) => (RANK[cur] > RANK[worst] ? cur : worst), 'normal' as TriageLevel);
}

/**
 * Pilih rentang rujukan yang berlaku untuk kohort tertentu.
 * Prioritas: kohort persis -> 'umum' -> rentang aktif pertama. Hanya yang aktif.
 */
export function resolveReferenceRange(
  ranges: ReferenceRange[],
  cohort = 'umum',
): ReferenceRange | null {
  const active = ranges.filter((r) => r.isActive !== false);
  if (active.length === 0) return null;
  return (
    active.find((r) => r.cohort === cohort) ??
    active.find((r) => r.cohort === 'umum') ??
    active[0]
  );
}

/** Evaluasi satu sesi pemeriksaan utuh -> hasil per parameter + ringkasan. */
export function evaluateCheckup(values: CheckupValue[]): {
  results: { code: string; result: EvalResult }[];
  summary: TriageLevel;
} {
  const results = values.map((v) => ({
    code: v.parameter.code,
    result: evaluateParameter(v.value, v.range),
  }));
  const summary = summarizeCheckup(results.map((r) => r.result.triage));
  return { results, summary };
}
