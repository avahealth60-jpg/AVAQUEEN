/**
 * Mesin evaluasi QC kalibrasi alat — wedge produk AVA.
 *
 * Setiap titik kalibrasi membandingkan nilai TERUKUR alat terhadap nilai
 * REFERENSI standar lab, dengan toleransi (% atau absolut). Hasil keseluruhan
 * = yang terburuk dari semua titik (default deny ke sisi aman).
 */

import type { QcResult } from './types.js';

export interface QcCheck {
  readonly metric: string;
  readonly measured: number;
  readonly reference: number;
  /** Toleransi lolos. Bisa relatif (% dari referensi) atau absolut. */
  readonly tolerance: { type: 'pct'; value: number } | { type: 'abs'; value: number };
}

export interface QcCheckOutcome extends QcCheck {
  readonly deviation: number; // selisih absolut |measured - reference|
  readonly allowed: number; // ambang lolos absolut
  readonly result: QcResult;
}

export interface QcEvaluation {
  readonly result: QcResult;
  readonly checks: readonly QcCheckOutcome[];
}

export class QcError extends Error {}

function allowedAbsolute(check: QcCheck): number {
  if (check.tolerance.type === 'abs') return Math.abs(check.tolerance.value);
  // relatif: % dari referensi (referensi 0 dengan toleransi % tak bermakna)
  if (check.reference === 0) {
    throw new QcError(`Cek "${check.metric}": toleransi % butuh referensi != 0.`);
  }
  return Math.abs(check.reference) * (check.tolerance.value / 100);
}

/**
 * Evaluasi satu titik:
 *   deviasi <= allowed            → lulus
 *   allowed < deviasi <= 2*allowed → perlu_tinjau (borderline, butuh mata manusia)
 *   deviasi > 2*allowed            → gagal
 */
export function evaluateCheck(check: QcCheck): QcCheckOutcome {
  for (const v of [check.measured, check.reference]) {
    if (!Number.isFinite(v)) throw new QcError(`Cek "${check.metric}": nilai harus berhingga.`);
  }
  const allowed = allowedAbsolute(check);
  const deviation = Math.abs(check.measured - check.reference);
  let result: QcResult;
  if (deviation <= allowed) result = 'lulus';
  else if (deviation <= allowed * 2) result = 'perlu_tinjau';
  else result = 'gagal';
  return { ...check, deviation, allowed, result };
}

const QC_SEVERITY: Record<QcResult, number> = { lulus: 0, perlu_tinjau: 1, gagal: 2 };

/** Hasil QC keseluruhan = titik terburuk. Tanpa titik → perlu_tinjau (tak bisa diklaim lulus). */
export function evaluateQc(checks: readonly QcCheck[]): QcEvaluation {
  if (checks.length === 0) {
    return { result: 'perlu_tinjau', checks: [] };
  }
  const outcomes = checks.map(evaluateCheck);
  const worst = outcomes.reduce<QcResult>(
    (acc, o) => (QC_SEVERITY[o.result] > QC_SEVERITY[acc] ? o.result : acc),
    'lulus',
  );
  return { result: worst, checks: outcomes };
}
