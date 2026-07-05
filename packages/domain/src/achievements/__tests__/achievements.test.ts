import { describe, it, expect } from 'vitest';
import {
  evaluateAchievements, isEarned, earnedCount, ACHIEVEMENTS,
  type AchievementStats,
} from '../index.js';

const base: AchievementStats = {
  readings: 0, wellnessStreak: 0, wearableConnected: false, premium: false, consultsCompleted: 0,
};

describe('achievements', () => {
  it('pengguna baru: tak ada lencana', () => {
    expect(earnedCount(base)).toBe(0);
  });
  it('1 pemeriksaan → langkah pertama', () => {
    const s = { ...base, readings: 1 };
    expect(evaluateAchievements(s).find((a) => a.id === 'langkah_pertama')!.earned).toBe(true);
    expect(evaluateAchievements(s).find((a) => a.id === 'pencatat_rajin')!.earned).toBe(false);
  });
  it('50 pemeriksaan → ketiga tingkat pencatat', () => {
    const s = { ...base, readings: 50 };
    const v = evaluateAchievements(s);
    for (const id of ['langkah_pertama', 'pencatat_rajin', 'pencatat_ahli']) {
      expect(v.find((a) => a.id === id)!.earned).toBe(true);
    }
  });
  it('streak & boolean berbasis kondisi', () => {
    const s = { ...base, wellnessStreak: 7, wearableConnected: true, premium: true, consultsCompleted: 2 };
    expect(isEarned(ACHIEVEMENTS.find((a) => a.id === 'konsisten_7')!, s)).toBe(true);
    expect(isEarned(ACHIEVEMENTS.find((a) => a.id === 'konsisten_30')!, s)).toBe(false);
    expect(isEarned(ACHIEVEMENTS.find((a) => a.id === 'terhubung')!, s)).toBe(true);
    expect(isEarned(ACHIEVEMENTS.find((a) => a.id === 'sahabat_ava')!, s)).toBe(true);
    expect(isEarned(ACHIEVEMENTS.find((a) => a.id === 'peduli_diri')!, s)).toBe(true);
  });
  it('current membawa nilai metrik untuk progress', () => {
    const v = evaluateAchievements({ ...base, readings: 7 });
    expect(v.find((a) => a.id === 'pencatat_rajin')!.current).toBe(7); // 7/10
  });
});
