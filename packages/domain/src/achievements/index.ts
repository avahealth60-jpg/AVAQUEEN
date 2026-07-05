/**
 * AVA Health — Domain Lencana/Achievement (rewards). Murni & teruji.
 *
 * Lencana DITURUNKAN dari aktivitas nyata pengguna (jumlah pemeriksaan, streak
 * wellness, koneksi wearable, dll) — tak perlu tabel khusus, dihitung dari data
 * yang sudah ada. Edukatif & memotivasi, bukan klaim medis.
 */

export type AchievementId =
  | 'langkah_pertama' | 'pencatat_rajin' | 'pencatat_ahli'
  | 'konsisten_3' | 'konsisten_7' | 'konsisten_30'
  | 'terhubung' | 'sahabat_ava' | 'peduli_diri';

export interface AchievementStats {
  readings: number;          // jumlah pemeriksaan tercatat
  wellnessStreak: number;    // streak terpanjang program aktif
  wearableConnected: boolean;
  premium: boolean;
  consultsCompleted: number;
}

export interface Achievement {
  id: AchievementId;
  title: string;
  desc: string;
  icon: string;              // emoji ringan
  /** Ambang untuk lencana berbasis hitungan (untuk progress bar). */
  target?: number;
  metric?: keyof AchievementStats;
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'langkah_pertama', title: 'Langkah pertama', desc: 'Catat pemeriksaan pertamamu', icon: '🌱', target: 1, metric: 'readings' },
  { id: 'pencatat_rajin', title: 'Pencatat rajin', desc: 'Catat 10 pemeriksaan', icon: '📈', target: 10, metric: 'readings' },
  { id: 'pencatat_ahli', title: 'Pencatat ahli', desc: 'Catat 50 pemeriksaan', icon: '🏅', target: 50, metric: 'readings' },
  { id: 'konsisten_3', title: 'Mulai konsisten', desc: 'Streak wellness 3 hari', icon: '🔥', target: 3, metric: 'wellnessStreak' },
  { id: 'konsisten_7', title: 'Seminggu penuh', desc: 'Streak wellness 7 hari', icon: '⚡', target: 7, metric: 'wellnessStreak' },
  { id: 'konsisten_30', title: 'Sebulan hebat', desc: 'Streak wellness 30 hari', icon: '👑', target: 30, metric: 'wellnessStreak' },
  { id: 'terhubung', title: 'Terhubung', desc: 'Hubungkan smartwatch', icon: '⌚' },
  { id: 'sahabat_ava', title: 'Sahabat AVA', desc: 'Berlangganan Premium', icon: '💎' },
  { id: 'peduli_diri', title: 'Peduli diri', desc: 'Selesaikan 1 konsultasi', icon: '🩺', target: 1, metric: 'consultsCompleted' },
];

export interface AchievementView extends Achievement {
  earned: boolean;
  current: number;   // nilai saat ini untuk metrik berbasis hitungan (0 utk boolean)
}

/** Apakah satu lencana sudah diraih berdasar statistik. */
export function isEarned(a: Achievement, s: AchievementStats): boolean {
  switch (a.id) {
    case 'terhubung': return s.wearableConnected;
    case 'sahabat_ava': return s.premium;
    default:
      if (a.metric && a.target != null) return (s[a.metric] as number) >= a.target;
      return false;
  }
}

/** Evaluasi semua lencana → daftar dengan status & progres. */
export function evaluateAchievements(s: AchievementStats): AchievementView[] {
  return ACHIEVEMENTS.map((a) => ({
    ...a,
    earned: isEarned(a, s),
    current: a.metric ? (s[a.metric] as number) : 0,
  }));
}

/** Jumlah lencana yang sudah diraih. */
export function earnedCount(s: AchievementStats): number {
  return ACHIEVEMENTS.reduce((n, a) => n + (isEarned(a, s) ? 1 : 0), 0);
}
