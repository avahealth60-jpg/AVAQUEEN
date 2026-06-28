/**
 * AVA Health — Domain Pemeriksaan (V1.1.1)
 * Tipe inti untuk katalog parameter & evaluasi triase deterministik.
 *
 * PRINSIP: keputusan berisiko (triase) dihitung aturan teruji di sini,
 * BUKAN diserahkan ke AI generatif. Lapisan ini = "kebenaran deterministik".
 * Rentang rujukan adalah DATA (dari tabel reference_ranges), sehingga
 * menambah parameter = menambah baris teraudit, bukan menulis kode baru.
 */

export type TriageLevel = 'normal' | 'perhatian' | 'segera';

/** Satu rentang rujukan untuk sebuah parameter & kohort. Cerminan baris DB. */
export interface ReferenceRange {
  /** Kohort yang berlaku (mis. 'umum', 'dewasa', 'pria', 'wanita'). */
  cohort: string;
  /** Batas rentang normal (inklusif). Boleh kosong bila parameter belum punya rentang. */
  normalMin?: number | null;
  normalMax?: number | null;
  /** Skala tampil untuk motif kalibrasi. */
  scaleMin: number;
  scaleMax: number;
  /** Ambang kritis: di bawah urgentLow atau di atas urgentHigh => 'segera'. Opsional. */
  urgentLow?: number | null;
  urgentHigh?: number | null;
  /** WAJIB untuk auditabilitas — siapa & kapan menandatangani rentang ini. */
  source: string;
  signedOffBy: string;
  signedOffAt: string; // ISO date
  isActive?: boolean;
}

/** Definisi parameter dari katalog. Cerminan baris tabel parameters. */
export interface Parameter {
  code: string; // 'glukosa_puasa'
  name: string; // 'Gula darah puasa'
  unit: string | null; // 'mg/dL'
  panelCode: string; // 'glikemik'
  decimals?: number;
  /** Kode LOINC opsional untuk pemetaan FHIR (bila sudah dipetakan klinisi). */
  loinc?: string | null;
}

export interface EvalResult {
  triage: TriageLevel;
  /** Alasan singkat & edukatif (bukan diagnosis). */
  reason: string;
  /** Apakah rentang rujukan tersedia untuk evaluasi ini. */
  hasRange: boolean;
}

/** Nilai pemeriksaan tunggal dalam satu sesi. Cerminan baris checkup_values. */
export interface CheckupValue {
  parameter: Parameter;
  value: number;
  range?: ReferenceRange | null;
}
