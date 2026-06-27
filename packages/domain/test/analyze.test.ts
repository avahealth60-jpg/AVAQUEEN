import { describe, it, expect } from 'vitest';
import { analyzeReading } from '../src/analyze.js';
import { EDUCATIONAL_DISCLAIMER } from '../src/types.js';

describe('analyzeReading — penguncian posisi edukatif', () => {
  it('SELALU is_educational=true dan disclaimer wajib (invariant SaMD)', () => {
    const inputs = [
      { type: 'spo2', value: 98 },
      { type: 'spo2', value: 85 },
      { type: 'glucose_fasting', value: 300 },
      { type: 'blood_pressure', systolic: 185, diastolic: 95 },
    ] as const;
    for (const input of inputs) {
      const r = analyzeReading(input);
      expect(r.is_educational).toBe(true);
      expect(r.disclaimer).toBe(EDUCATIONAL_DISCLAIMER);
      expect(r.disclaimer.length).toBeGreaterThan(0);
    }
  });

  it('triase normal → tidak dorong konsultasi', () => {
    const r = analyzeReading({ type: 'spo2', value: 98 });
    expect(r.triage).toBe('normal');
    expect(r.suggest_consultation).toBe(false);
  });

  it('triase segera → dorong konsultasi', () => {
    const r = analyzeReading({ type: 'glucose_fasting', value: 300 });
    expect(r.triage).toBe('segera');
    expect(r.suggest_consultation).toBe(true);
  });

  it('tekanan darah komposit ditriase benar', () => {
    expect(analyzeReading({ type: 'blood_pressure', systolic: 115, diastolic: 75 }).triage).toBe('normal');
    expect(analyzeReading({ type: 'blood_pressure', systolic: 185, diastolic: 95 }).triage).toBe('segera');
  });

  it('explanation tidak pernah memuat kata "diagnosis" sebagai klaim', () => {
    const r = analyzeReading({ type: 'glucose_fasting', value: 300 });
    expect(r.explanation.toLowerCase()).not.toContain('diagnosis');
  });
});
