import { describe, it, expect } from 'vitest';
import { wellnessScore, wellnessScoreLabel } from '../index.js';

describe('wellnessScore', () => {
  it('semua normal + streak panjang → tinggi', () => {
    const r = wellnessScore({ recentTriages: ['normal', 'normal', 'normal'], streak: 14, activeMetrics: 4 });
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.label).toBe('Sangat baik');
  });
  it('hasil "segera" menurunkan skor tajam', () => {
    const a = wellnessScore({ recentTriages: ['normal'], streak: 0, activeMetrics: 0 });
    const b = wellnessScore({ recentTriages: ['segera', 'segera'], streak: 0, activeMetrics: 0 });
    expect(b.score).toBeLessThan(a.score);
  });
  it('dibatasi 0–100', () => {
    const hi = wellnessScore({ recentTriages: Array(30).fill('normal'), streak: 100, activeMetrics: 20 });
    const lo = wellnessScore({ recentTriages: Array(30).fill('segera'), streak: 0, activeMetrics: 0 });
    expect(hi.score).toBeLessThanOrEqual(100);
    expect(lo.score).toBeGreaterThanOrEqual(0);
  });
  it('label sesuai ambang', () => {
    expect(wellnessScoreLabel(90)).toBe('Sangat baik');
    expect(wellnessScoreLabel(75)).toBe('Baik');
    expect(wellnessScoreLabel(55)).toBe('Cukup');
    expect(wellnessScoreLabel(30)).toBe('Perlu perhatian');
  });
});
