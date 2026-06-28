import { describe, it, expect } from 'vitest';
import {
  evaluateParameter,
  summarizeCheckup,
  resolveReferenceRange,
  evaluateCheckup,
} from '../evaluate.js';
import type { ReferenceRange, Parameter } from '../types.js';

const gula: ReferenceRange = {
  cohort: 'umum',
  normalMin: 70,
  normalMax: 99,
  scaleMin: 50,
  scaleMax: 250,
  urgentLow: 54,
  urgentHigh: 125,
  source: 'contoh',
  signedOffBy: 'klinisi',
  signedOffAt: '2026-06-01',
};

describe('evaluateParameter — gula darah puasa', () => {
  it('di dalam rentang normal -> normal (inklusif di batas)', () => {
    expect(evaluateParameter(70, gula).triage).toBe('normal');
    expect(evaluateParameter(85, gula).triage).toBe('normal');
    expect(evaluateParameter(99, gula).triage).toBe('normal');
  });

  it('sedikit di luar normal tapi belum kritis -> perhatian', () => {
    expect(evaluateParameter(100, gula).triage).toBe('perhatian'); // tepat di atas normalMax
    expect(evaluateParameter(108, gula).triage).toBe('perhatian');
    expect(evaluateParameter(69, gula).triage).toBe('perhatian'); // di bawah normalMin
  });

  it('melewati ambang kritis -> segera', () => {
    expect(evaluateParameter(126, gula).triage).toBe('segera'); // > urgentHigh 125
    expect(evaluateParameter(40, gula).triage).toBe('segera'); // < urgentLow 54
  });

  it('batas kritis bersifat strict ( = ambang masih perhatian, bukan segera )', () => {
    expect(evaluateParameter(125, gula).triage).toBe('perhatian'); // == urgentHigh, tidak > 
    expect(evaluateParameter(54, gula).triage).toBe('perhatian'); // == urgentLow, tidak <
  });

  it('alasan selalu edukatif & terisi', () => {
    expect(evaluateParameter(126, gula).reason.length).toBeGreaterThan(0);
  });

  it('melempar untuk nilai non-angka', () => {
    expect(() => evaluateParameter(NaN, gula)).toThrow();
    expect(() => evaluateParameter(Infinity, gula)).toThrow();
  });
});

describe('evaluateParameter — tanpa rentang / tanpa pita normal', () => {
  it('tanpa rentang -> normal & hasRange=false', () => {
    const r = evaluateParameter(123, null);
    expect(r.triage).toBe('normal');
    expect(r.hasRange).toBe(false);
  });

  it('punya skala tapi tanpa pita normal -> normal & hasRange=false', () => {
    const onlyScale: ReferenceRange = {
      cohort: 'umum', scaleMin: 0, scaleMax: 100,
      source: 's', signedOffBy: 'k', signedOffAt: '2026-01-01',
    };
    const r = evaluateParameter(50, onlyScale);
    expect(r.triage).toBe('normal');
    expect(r.hasRange).toBe(false);
  });

  it('hanya urgentHigh tanpa pita normal tetap bisa "segera"', () => {
    const crit: ReferenceRange = {
      cohort: 'umum', scaleMin: 0, scaleMax: 300, urgentHigh: 200,
      source: 's', signedOffBy: 'k', signedOffAt: '2026-01-01',
    };
    expect(evaluateParameter(250, crit).triage).toBe('segera');
    expect(evaluateParameter(150, crit).triage).toBe('normal'); // tak ada pita normal -> normal
  });
});

describe('summarizeCheckup — roll-up terburuk', () => {
  it('mengambil yang terparah', () => {
    expect(summarizeCheckup(['normal', 'perhatian', 'normal'])).toBe('perhatian');
    expect(summarizeCheckup(['normal', 'perhatian', 'segera'])).toBe('segera');
    expect(summarizeCheckup(['normal', 'normal'])).toBe('normal');
  });
  it('sesi kosong -> normal', () => {
    expect(summarizeCheckup([])).toBe('normal');
  });
});

describe('resolveReferenceRange — pemilihan kohort', () => {
  const ranges: ReferenceRange[] = [
    { ...gula, cohort: 'umum' },
    { ...gula, cohort: 'wanita', normalMax: 95 },
    { ...gula, cohort: 'nonaktif', isActive: false },
  ];
  it('cocok kohort persis', () => {
    expect(resolveReferenceRange(ranges, 'wanita')?.normalMax).toBe(95);
  });
  it('fallback ke umum', () => {
    expect(resolveReferenceRange(ranges, 'pria')?.cohort).toBe('umum');
  });
  it('mengabaikan rentang nonaktif', () => {
    expect(resolveReferenceRange([{ ...gula, cohort: 'x', isActive: false }], 'x')).toBeNull();
  });
});

describe('evaluateCheckup — sesi utuh', () => {
  const p = (code: string): Parameter => ({ code, name: code, unit: 'mg/dL', panelCode: 'glikemik' });
  it('menggabungkan hasil per parameter + ringkasan', () => {
    const out = evaluateCheckup([
      { parameter: p('glukosa_puasa'), value: 88, range: gula },
      { parameter: p('glukosa_sewaktu'), value: 130, range: gula },
    ]);
    expect(out.results).toHaveLength(2);
    expect(out.results[0].result.triage).toBe('normal');
    expect(out.results[1].result.triage).toBe('segera');
    expect(out.summary).toBe('segera');
  });
});
