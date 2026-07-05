/**
 * AVA Health — Domain Wellness (Fase B: program & kebiasaan sehat)
 *
 * Wellness bersifat EDUKATIF & berorientasi kebiasaan/target harian. Ia
 * memanfaatkan metrik gaya hidup (langkah, tidur, menit aktif) yang mengalir
 * dari input manual maupun wearable (Fase A).
 *
 * PRINSIP (menjaga posisi non-SaMD):
 *   - Wellness TIDAK PERNAH menghasilkan triase. Kosakata statusnya terpisah
 *     (`achieved` | `on_track` | `behind`) sehingga secara TIPE mustahil
 *     menyusup ke jalur triase klinis ('segera' dst.).
 *   - Program adalah DATA terkurasi (WELLNESS_CATALOG), bisa ditinjau &
 *     ditautkan ke basis pengetahuan; menambah program = menambah data.
 */

/** Metrik yang bisa dijadikan target harian sebuah program. */
export type WellnessMetric =
  | 'steps' // langkah/hari
  | 'sleep_minutes' // menit tidur/hari
  | 'active_minutes' // menit aktif/hari
  | 'hydration_ml' // ml air/hari (biasanya dari check-in manual)
  | 'checkin'; // kebiasaan boolean (dilakukan/tidak), target = 1

/** Status pencapaian harian — SENGAJA terpisah dari tipe Triage. */
export type WellnessStatus = 'achieved' | 'on_track' | 'behind';

/** Satu program wellness terkurasi. Cerminan entri WELLNESS_CATALOG. */
export interface WellnessProgram {
  code: string;
  title: string;
  description: string;
  metric: WellnessMetric;
  /** Target harian dalam satuan metrik (mis. 10000 langkah, 420 menit tidur). */
  dailyTarget: number;
  unit: string;
  /** Kohort yang paling relevan (mis. 'umum', 'prediabetes', 'hipertensi'). */
  cohort: string;
  /** Durasi program yang disarankan (hari). */
  durationDays: number;
  /** Kode parameter/pengetahuan terkait (opsional) untuk pendalaman edukatif. */
  knowledgeRefs?: readonly string[];
}

/** Nilai harian sebuah metrik (satu tanggal). Tanggal format 'YYYY-MM-DD'. */
export interface DailyValue {
  date: string;
  value: number;
}

/** Cara meringkas beberapa reading dalam satu hari menjadi satu nilai. */
export type AggregateMode = 'sum' | 'max' | 'last';

/** Ringkasan progres sebuah program terhadap deret harian. */
export interface ProgressSummary {
  metric: WellnessMetric;
  target: number;
  /** Nilai hari terakhir yang tercatat (0 bila tak ada data). */
  latest: number;
  /** Persentase pencapaian hari terakhir terhadap target (0–100, dibatasi). */
  percentToday: number;
  status: WellnessStatus;
  /** Rangkaian hari beruntun terkini yang memenuhi target. */
  streak: number;
  /** Rekor rangkaian beruntun terpanjang. */
  bestStreak: number;
  /** Berapa hari (dari data) memenuhi target. */
  daysMetTarget: number;
  /** Total hari berdata. */
  totalDays: number;
}
