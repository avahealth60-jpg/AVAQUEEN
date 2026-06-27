import { describe, it, expect } from 'vitest';
import { evaluateCheck, evaluateQc, QcError } from '../src/qc.js';

describe('evaluateCheck — toleransi persen', () => {
  const base = { metric: 'tekanan', reference: 120, tolerance: { type: 'pct', value: 5 } } as const;

  it('dalam toleransi → lulus', () => {
    // allowed = 120 * 5% = 6
    expect(evaluateCheck({ ...base, measured: 124 }).result).toBe('lulus'); // dev 4
    expect(evaluateCheck({ ...base, measured: 126 }).result).toBe('lulus'); // dev 6 (== allowed)
  });
  it('antara 1x dan 2x toleransi → perlu_tinjau', () => {
    expect(evaluateCheck({ ...base, measured: 130 }).result).toBe('perlu_tinjau'); // dev 10
    expect(evaluateCheck({ ...base, measured: 132 }).result).toBe('perlu_tinjau'); // dev 12 (== 2x)
  });
  it('di atas 2x toleransi → gagal', () => {
    expect(evaluateCheck({ ...base, measured: 133 }).result).toBe('gagal'); // dev 13
  });
});

describe('evaluateCheck — toleransi absolut', () => {
  it('memakai ambang absolut, abaikan referensi untuk lebar pita', () => {
    const c = { metric: 'suhu', reference: 37, measured: 37.4, tolerance: { type: 'abs', value: 0.3 } } as const;
    // dev 0.4, allowed 0.3 → perlu_tinjau (dalam 2x = 0.6)
    expect(evaluateCheck(c).result).toBe('perlu_tinjau');
  });
});

describe('evaluateCheck — validasi', () => {
  it('toleransi persen dengan referensi 0 dilarang', () => {
    expect(() =>
      evaluateCheck({ metric: 'x', reference: 0, measured: 1, tolerance: { type: 'pct', value: 5 } }),
    ).toThrow(QcError);
  });
  it('nilai non-finite dilarang', () => {
    expect(() =>
      evaluateCheck({ metric: 'x', reference: 10, measured: NaN, tolerance: { type: 'abs', value: 1 } }),
    ).toThrow(QcError);
  });
});

describe('evaluateQc — agregasi', () => {
  it('keseluruhan = titik terburuk', () => {
    const r = evaluateQc([
      { metric: 'a', reference: 100, measured: 101, tolerance: { type: 'pct', value: 5 } }, // lulus
      { metric: 'b', reference: 100, measured: 130, tolerance: { type: 'pct', value: 5 } }, // gagal
    ]);
    expect(r.result).toBe('gagal');
    expect(r.checks).toHaveLength(2);
  });
  it('semua lulus → lulus', () => {
    const r = evaluateQc([
      { metric: 'a', reference: 100, measured: 100, tolerance: { type: 'pct', value: 5 } },
      { metric: 'b', reference: 50, measured: 51, tolerance: { type: 'pct', value: 5 } },
    ]);
    expect(r.result).toBe('lulus');
  });
  it('tanpa titik → perlu_tinjau (tak boleh diklaim lulus)', () => {
    expect(evaluateQc([]).result).toBe('perlu_tinjau');
  });
});
