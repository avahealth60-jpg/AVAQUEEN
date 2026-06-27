import { describe, it, expect } from 'vitest';
import {
  REFERENCE_CATALOG,
  assertBandsValid,
  evaluateMetric,
  evaluateBloodPressure,
  worstTriage,
  ReferenceRangeError,
} from '../src/reference-range.js';

describe('integritas katalog reference-range', () => {
  it('setiap metrik punya pita yang menutup penuh tanpa celah/tumpang tindih', () => {
    for (const spec of Object.values(REFERENCE_CATALOG)) {
      expect(() => assertBandsValid(spec)).not.toThrow();
    }
  });
});

describe('evaluateMetric — batas pita inklusif/eksklusif', () => {
  it('batas bawah inklusif, batas atas eksklusif', () => {
    // glukosa puasa: normal [70,100)
    expect(evaluateMetric(REFERENCE_CATALOG.glucose_fasting, 70).triage).toBe('normal');
    expect(evaluateMetric(REFERENCE_CATALOG.glucose_fasting, 99.9).triage).toBe('normal');
    expect(evaluateMetric(REFERENCE_CATALOG.glucose_fasting, 100).triage).toBe('perhatian');
    expect(evaluateMetric(REFERENCE_CATALOG.glucose_fasting, 69.9).triage).toBe('perhatian');
  });

  it('ekstrem rendah dan tinggi → segera', () => {
    expect(evaluateMetric(REFERENCE_CATALOG.glucose_fasting, 40).triage).toBe('segera');
    expect(evaluateMetric(REFERENCE_CATALOG.glucose_fasting, 300).triage).toBe('segera');
    expect(evaluateMetric(REFERENCE_CATALOG.spo2, 88).triage).toBe('segera');
    expect(evaluateMetric(REFERENCE_CATALOG.spo2, 97).triage).toBe('normal');
  });

  it('menolak nilai non-finite', () => {
    expect(() => evaluateMetric(REFERENCE_CATALOG.spo2, NaN)).toThrow(ReferenceRangeError);
    expect(() => evaluateMetric(REFERENCE_CATALOG.spo2, Infinity)).toThrow(ReferenceRangeError);
  });
});

describe('worstTriage', () => {
  it('mengambil yang paling parah', () => {
    expect(worstTriage(['normal', 'perhatian', 'segera'])).toBe('segera');
    expect(worstTriage(['normal', 'perhatian'])).toBe('perhatian');
    expect(worstTriage(['normal', 'normal'])).toBe('normal');
    expect(worstTriage([])).toBe('normal');
  });
});

describe('evaluateBloodPressure — komposit', () => {
  it('normal hanya jika sistolik DAN diastolik normal', () => {
    expect(evaluateBloodPressure(115, 75).triage).toBe('normal');
  });
  it('satu nilai perhatian menaikkan keseluruhan', () => {
    expect(evaluateBloodPressure(115, 85).triage).toBe('perhatian'); // diastolik tinggi
    expect(evaluateBloodPressure(150, 75).triage).toBe('perhatian'); // sistolik tinggi
  });
  it('krisis hipertensi → segera (ambil terburuk)', () => {
    expect(evaluateBloodPressure(185, 95).triage).toBe('segera');
    expect(evaluateBloodPressure(150, 125).triage).toBe('segera');
  });
  it('hipotensi → perhatian', () => {
    expect(evaluateBloodPressure(85, 55).triage).toBe('perhatian');
  });
});
