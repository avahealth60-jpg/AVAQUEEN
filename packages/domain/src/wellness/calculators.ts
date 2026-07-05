/**
 * AVA Health — Kalkulator Wellness (rumus terbuka/standar, EDUKATIF).
 *
 * Semua di sini murni & deterministik — siap pakai, tanpa upload/perangkat.
 * Rumus & ambang memakai referensi publik yang lazim dipakai di Indonesia:
 *   - IMT (BMI) + kategori Kemenkes P2PTM.
 *   - BMR: Mifflin–St Jeor. TDEE: faktor aktivitas standar.
 *   - Kalori olahraga: metode MET (Compendium of Physical Activities).
 * CATATAN: hasil bersifat EDUKATIF, bukan penilaian medis.
 */

export class CalculatorError extends Error {}

function positive(n: number, name: string): void {
  if (!Number.isFinite(n) || n <= 0) throw new CalculatorError(`${name} harus angka > 0.`);
}

/* ── IMT / BMI ─────────────────────────────────────────────────── */
export type BmiCategory =
  | 'sangat_kurus' | 'kurus' | 'normal' | 'gemuk' | 'obesitas';

export interface BmiResult {
  bmi: number;            // 1 desimal
  category: BmiCategory;
  label: string;
  /** Rentang berat sehat (kg) untuk tinggi ini (IMT 18.5–25). */
  healthyMin: number;
  healthyMax: number;
}

const BMI_LABEL: Record<BmiCategory, string> = {
  sangat_kurus: 'Sangat kurus',
  kurus: 'Kurus',
  normal: 'Normal',
  gemuk: 'Gemuk',
  obesitas: 'Obesitas',
};

/** Kategori IMT menurut Kemenkes P2PTM (dewasa Indonesia). */
export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 17) return 'sangat_kurus';
  if (bmi < 18.5) return 'kurus';
  if (bmi <= 25) return 'normal';
  if (bmi <= 27) return 'gemuk';
  return 'obesitas';
}

/** Rentang berat "sehat" (kg) untuk tinggi tertentu — IMT 18.5 s/d 25. */
export function healthyWeightRange(heightCm: number): { minKg: number; maxKg: number } {
  positive(heightCm, 'Tinggi');
  const m = heightCm / 100;
  return {
    minKg: Math.round(18.5 * m * m * 10) / 10,
    maxKg: Math.round(25 * m * m * 10) / 10,
  };
}

export function calcBmi(weightKg: number, heightCm: number): BmiResult {
  positive(weightKg, 'Berat');
  positive(heightCm, 'Tinggi');
  const m = heightCm / 100;
  const bmi = Math.round((weightKg / (m * m)) * 10) / 10;
  const category = bmiCategory(bmi);
  const { minKg, maxKg } = healthyWeightRange(heightCm);
  return { bmi, category, label: BMI_LABEL[category], healthyMin: minKg, healthyMax: maxKg };
}

/* ── BMR / TDEE ────────────────────────────────────────────────── */
export type Sex = 'pria' | 'wanita';
export type ActivityLevel = 'sedentary' | 'ringan' | 'sedang' | 'aktif' | 'sangat_aktif';

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,      // jarang olahraga
  ringan: 1.375,       // 1–3x/minggu
  sedang: 1.55,        // 3–5x/minggu
  aktif: 1.725,        // 6–7x/minggu
  sangat_aktif: 1.9,   // fisik berat / atlet
};

export const ACTIVITY_LEVEL_LABEL: Record<ActivityLevel, string> = {
  sedentary: 'Jarang bergerak',
  ringan: 'Aktivitas ringan (1–3x/mgg)',
  sedang: 'Aktivitas sedang (3–5x/mgg)',
  aktif: 'Aktif (6–7x/mgg)',
  sangat_aktif: 'Sangat aktif / atlet',
};

/** BMR (kalori/hari) — Mifflin–St Jeor. */
export function calcBmr(sex: Sex, weightKg: number, heightCm: number, ageYears: number): number {
  positive(weightKg, 'Berat');
  positive(heightCm, 'Tinggi');
  positive(ageYears, 'Usia');
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return Math.round(base + (sex === 'pria' ? 5 : -161));
}

/** Kebutuhan kalori harian (TDEE) = BMR × faktor aktivitas. */
export function calcTdee(bmr: number, level: ActivityLevel): number {
  positive(bmr, 'BMR');
  return Math.round(bmr * ACTIVITY_FACTOR[level]);
}

/* ── Kalori olahraga (MET) ─────────────────────────────────────── */
export interface ActivitySpec { key: string; label: string; met: number; }

/** Nilai MET umum (Compendium of Physical Activities). Edukatif. */
export const ACTIVITY_METS = {
  jalan_santai: { key: 'jalan_santai', label: 'Jalan santai', met: 3.0 },
  jalan_cepat: { key: 'jalan_cepat', label: 'Jalan cepat', met: 4.3 },
  lari_ringan: { key: 'lari_ringan', label: 'Lari ringan (±8 km/j)', met: 8.3 },
  lari_sedang: { key: 'lari_sedang', label: 'Lari sedang (±10 km/j)', met: 9.8 },
  lari_cepat: { key: 'lari_cepat', label: 'Lari cepat (±12 km/j)', met: 11.8 },
  sepeda_santai: { key: 'sepeda_santai', label: 'Sepeda santai (<16 km/j)', met: 4.0 },
  sepeda_sedang: { key: 'sepeda_sedang', label: 'Sepeda sedang (19–22 km/j)', met: 8.0 },
  sepeda_cepat: { key: 'sepeda_cepat', label: 'Sepeda cepat (>22 km/j)', met: 10.0 },
  renang: { key: 'renang', label: 'Renang', met: 6.0 },
  senam: { key: 'senam', label: 'Senam / aerobik', met: 6.5 },
  yoga: { key: 'yoga', label: 'Yoga', met: 2.5 },
} as const satisfies Record<string, ActivitySpec>;

export type ActivityKey = keyof typeof ACTIVITY_METS;

export function listActivities(): ActivitySpec[] {
  return Object.values(ACTIVITY_METS);
}

/** Kalori terbakar = MET × 3.5 × beratKg / 200 × menit. */
export function caloriesBurned(met: number, weightKg: number, minutes: number): number {
  positive(met, 'MET');
  positive(weightKg, 'Berat');
  positive(minutes, 'Durasi');
  return Math.round((met * 3.5 * weightKg / 200) * minutes);
}

/** Kalori olahraga berdasarkan jenis aktivitas yang dikenal. */
export function activityCalories(key: string, weightKg: number, minutes: number): number {
  const spec = (ACTIVITY_METS as Record<string, ActivitySpec>)[key];
  if (!spec) throw new CalculatorError(`Aktivitas "${key}" tidak dikenal.`);
  return caloriesBurned(spec.met, weightKg, minutes);
}

/* ── Lain-lain ─────────────────────────────────────────────────── */
/** Anjuran air harian (ml) ≈ 30 ml/kg berat badan. */
export function dailyWaterMl(weightKg: number): number {
  positive(weightKg, 'Berat');
  return Math.round(weightKg * 30);
}

/** Pace lari (menit per km). */
export function runningPace(minutes: number, km: number): { minPerKm: number; text: string } {
  positive(minutes, 'Durasi');
  positive(km, 'Jarak');
  const minPerKm = minutes / km;
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return { minPerKm: Math.round(minPerKm * 100) / 100, text: `${m}:${String(s).padStart(2, '0')} /km` };
}

/* ── Rencana target berat ──────────────────────────────────────── */
/** 1 kg lemak ≈ 7700 kkal. */
const KCAL_PER_KG = 7700;
export type WeightGoalDirection = 'turun' | 'naik' | 'jaga';

export interface WeightPlan {
  direction: WeightGoalDirection;
  totalKg: number;         // selisih absolut
  weeks: number;           // perkiraan minggu dgn laju aman
  dailyCalAdjust: number;  // + surplus / − defisit per hari (0 bila jaga)
}

/** Rencana capai berat target dengan laju aman (default 0.5 kg/minggu). */
export function targetWeightPlan(
  currentKg: number,
  targetKg: number,
  weeklyRateKg = 0.5,
): WeightPlan {
  positive(currentKg, 'Berat saat ini');
  positive(targetKg, 'Berat target');
  positive(weeklyRateKg, 'Laju/minggu');
  const diff = currentKg - targetKg; // + = perlu turun
  const totalKg = Math.round(Math.abs(diff) * 10) / 10;
  if (totalKg < 0.1) return { direction: 'jaga', totalKg: 0, weeks: 0, dailyCalAdjust: 0 };
  const weeks = Math.ceil(totalKg / weeklyRateKg);
  const dailyMag = Math.round((weeklyRateKg * KCAL_PER_KG) / 7);
  return {
    direction: diff > 0 ? 'turun' : 'naik',
    totalKg,
    weeks,
    dailyCalAdjust: diff > 0 ? -dailyMag : dailyMag,
  };
}

/* ── Kebutuhan makro ───────────────────────────────────────────── */
export type MacroPreset = 'seimbang' | 'tinggi_protein' | 'rendah_karbo';
const MACRO_SPLIT: Record<MacroPreset, { p: number; c: number; f: number }> = {
  seimbang: { p: 0.3, c: 0.4, f: 0.3 },
  tinggi_protein: { p: 0.4, c: 0.35, f: 0.25 },
  rendah_karbo: { p: 0.35, c: 0.25, f: 0.4 },
};
export const MACRO_PRESET_LABEL: Record<MacroPreset, string> = {
  seimbang: 'Seimbang',
  tinggi_protein: 'Tinggi protein',
  rendah_karbo: 'Rendah karbo',
};

export interface Macros { proteinG: number; carbG: number; fatG: number; }

/** Bagi kalori harian ke gram protein/karbo/lemak (4/4/9 kkal per gram). */
export function macros(calories: number, preset: MacroPreset = 'seimbang'): Macros {
  positive(calories, 'Kalori');
  const s = MACRO_SPLIT[preset];
  return {
    proteinG: Math.round((calories * s.p) / 4),
    carbG: Math.round((calories * s.c) / 4),
    fatG: Math.round((calories * s.f) / 9),
  };
}

/* ── Langkah → jarak & kalori ──────────────────────────────────── */
/** Estimasi jarak (km) dari jumlah langkah + tinggi (panjang langkah ≈ 0.415×tinggi). */
export function stepsToDistanceKm(steps: number, heightCm: number): number {
  positive(steps, 'Langkah');
  positive(heightCm, 'Tinggi');
  const strideCm = heightCm * 0.415;
  return Math.round(((steps * strideCm) / 100000) * 100) / 100;
}

/** Estimasi kalori dari langkah (≈ 0.0005 kkal per langkah per kg berat). */
export function stepsCalories(steps: number, weightKg: number): number {
  positive(steps, 'Langkah');
  positive(weightKg, 'Berat');
  return Math.round(steps * weightKg * 0.0005);
}
