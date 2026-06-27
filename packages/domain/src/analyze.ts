/**
 * Orkestrasi analisis hasil pemeriksaan — BAGIAN DETERMINISTIK.
 *
 * Fungsi ini menghasilkan triase + konteks edukatif TANPA LLM. Edge function
 * ai-analyze memanggil ini lebih dulu, lalu (opsional) meminta LLM hanya untuk
 * memperhalus `explanation`. Disclaimer & is_educational dikunci di sini & di skema.
 */

import { EDUCATIONAL_DISCLAIMER } from './types.js';
import type { Triage } from './types.js';
import {
  REFERENCE_CATALOG,
  evaluateBloodPressure,
  evaluateMetric,
  worstTriage,
  type ReferenceKey,
} from './reference-range.js';

export interface SingleReadingInput {
  readonly type: Exclude<ReferenceKey, 'bp_systolic' | 'bp_diastolic'>;
  readonly value: number;
}

export interface BloodPressureInput {
  readonly type: 'blood_pressure';
  readonly systolic: number;
  readonly diastolic: number;
}

export type ReadingInput = SingleReadingInput | BloodPressureInput;

export interface AnalysisDraft {
  readonly triage: Triage;
  /** Penjelasan edukatif baseline (deterministik). LLM boleh memperhalus, tak boleh mengubah triase. */
  readonly explanation: string;
  readonly is_educational: true;
  readonly disclaimer: string;
  /** Apakah pengguna sebaiknya didorong ke booking konsultasi. */
  readonly suggest_consultation: boolean;
}

function baselineExplanation(label: string, triage: Triage): string {
  switch (triage) {
    case 'normal':
      return `Hasil ${label} Anda berada dalam rentang rujukan umum. Tetap pantau secara berkala.`;
    case 'perhatian':
      return `Hasil ${label} Anda di luar rentang umum dan perlu perhatian. Pertimbangkan memantau ulang dan berkonsultasi bila berlanjut.`;
    case 'segera':
      return `Hasil ${label} Anda jauh di luar rentang umum. Sebaiknya segera berkonsultasi dengan tenaga kesehatan.`;
  }
}

export function analyzeReading(input: ReadingInput): AnalysisDraft {
  let triage: Triage;
  let label: string;

  if (input.type === 'blood_pressure') {
    const ev = evaluateBloodPressure(input.systolic, input.diastolic);
    triage = ev.triage;
    label = 'tekanan darah';
  } else {
    const spec = REFERENCE_CATALOG[input.type];
    const ev = evaluateMetric(spec, input.value);
    triage = worstTriage([ev.triage]);
    label = spec.label.toLowerCase();
  }

  return {
    triage,
    explanation: baselineExplanation(label, triage),
    is_educational: true,
    disclaimer: EDUCATIONAL_DISCLAIMER,
    suggest_consultation: triage !== 'normal',
  };
}
