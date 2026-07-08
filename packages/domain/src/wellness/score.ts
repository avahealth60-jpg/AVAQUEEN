/**
 * AVA Health — Skor Wellness komposit (edukatif, bukan diagnosis).
 * Murni & deterministik. Menggabungkan sinyal nyata: hasil pemeriksaan terkini,
 * streak kebiasaan, dan jumlah metrik aktif → satu angka 0–100 yang ramah.
 */
import type { Triage } from '../types.js';

export interface WellnessScoreInput {
  /** Triase pemeriksaan klinis terkini (mis. 14 hari). */
  recentTriages: Triage[];
  /** Streak wellness terpanjang saat ini (hari). */
  streak: number;
  /** Berapa metrik yang aktif dilacak (0–4+). */
  activeMetrics: number;
}

export type WellnessScoreLabel = 'Sangat baik' | 'Baik' | 'Cukup' | 'Perlu perhatian';

export interface WellnessScoreResult {
  score: number; // 0–100
  label: WellnessScoreLabel;
}

export function wellnessScoreLabel(score: number): WellnessScoreLabel {
  if (score >= 85) return 'Sangat baik';
  if (score >= 70) return 'Baik';
  if (score >= 50) return 'Cukup';
  return 'Perlu perhatian';
}

export function wellnessScore(input: WellnessScoreInput): WellnessScoreResult {
  let s = 72; // basis netral
  s += (Math.min(Math.max(input.streak, 0), 14) / 14) * 18; // konsistensi: hingga +18
  for (const t of input.recentTriages) {
    if (t === 'segera') s -= 16;
    else if (t === 'perhatian') s -= 6;
    else s += 1;
  }
  s += Math.min(Math.max(input.activeMetrics, 0), 4) * 1.5; // keterlibatan: hingga +6
  const score = Math.max(0, Math.min(100, Math.round(s)));
  return { score, label: wellnessScoreLabel(score) };
}
