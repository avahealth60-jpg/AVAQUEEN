import { describe, it, expect } from 'vitest';
import {
  K_ANONYMITY_MIN,
  shouldSuppress,
  participationRate,
  stepsBand,
  buildEmployerAggregate,
  CorporateError,
} from '../index.js';

describe('k-anonimitas', () => {
  it('K default = 5', () => expect(K_ANONYMITY_MIN).toBe(5));
  it('sembunyikan bila peserta < K', () => {
    expect(shouldSuppress(4)).toBe(true);
    expect(shouldSuppress(5)).toBe(false);
  });
  it('menolak peserta negatif/non-integer', () => {
    expect(() => shouldSuppress(-1)).toThrow(CorporateError);
    expect(() => shouldSuppress(2.5)).toThrow(CorporateError);
  });
});

describe('participationRate', () => {
  it('null bila disembunyikan (peserta < K)', () => {
    expect(participationRate(2, 3)).toBeNull();
  });
  it('persen dibulatkan bila peserta cukup', () => {
    expect(participationRate(3, 6)).toBe(50);
    expect(participationRate(6, 6)).toBe(100);
  });
});

describe('stepsBand — banding kasar (privasi)', () => {
  it('memetakan ke pita', () => {
    expect(stepsBand(3000)).toBe('<5k');
    expect(stepsBand(6000)).toBe('5–8k');
    expect(stepsBand(9000)).toBe('8–10k');
    expect(stepsBand(12000)).toBe('≥10k');
  });
});

describe('buildEmployerAggregate', () => {
  it('disembunyikan penuh saat peserta sedikit', () => {
    const a = buildEmployerAggregate(3, 2);
    expect(a.suppressed).toBe(true);
    expect(a.activeWellnessRate).toBeNull();
  });
  it('mengungkap rate saat peserta cukup', () => {
    const a = buildEmployerAggregate(10, 7);
    expect(a.suppressed).toBe(false);
    expect(a.activeWellnessRate).toBe(70);
  });
});
