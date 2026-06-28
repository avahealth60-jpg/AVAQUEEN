import { describe, it, expect } from 'vitest';
import { calibrationScale } from '../calibrationScale.js';

describe('skala kalibrasi (motif tanda tangan)', () => {
  const base = { scaleMin: 70, scaleMax: 200, normalMin: 70, normalMax: 99, unit: 'mg/dL' };

  it('mengembalikan SVG valid dengan viewBox dan aria-label', () => {
    const { svg } = calibrationScale({ ...base, value: 90 });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('viewBox="0 0 320 72"');
    expect(svg).toContain('aria-label');
    expect(svg).toContain('</svg>');
  });

  it('readout memakai font mono dan menampilkan nilai + satuan', () => {
    const { svg } = calibrationScale({ ...base, value: 126 });
    expect(svg).toContain('JetBrains Mono');
    expect(svg).toContain('126 mg/dL');
  });

  it('markerFraction 0..1, dan monoton naik terhadap value', () => {
    const lo = calibrationScale({ ...base, value: 80 }).markerFraction;
    const mid = calibrationScale({ ...base, value: 135 }).markerFraction;
    const hi = calibrationScale({ ...base, value: 190 }).markerFraction;
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(hi).toBeLessThanOrEqual(1);
    expect(mid).toBeGreaterThan(lo);
    expect(hi).toBeGreaterThan(mid);
  });

  it('CLAMP: nilai di bawah skala → fraction 0, di atas skala → fraction 1', () => {
    expect(calibrationScale({ ...base, value: 10 }).markerFraction).toBe(0);
    expect(calibrationScale({ ...base, value: 9999 }).markerFraction).toBe(1);
  });

  it('derivasi status: dalam rentang normal → normal', () => {
    expect(calibrationScale({ ...base, value: 85 }).status).toBe('normal');
  });

  it('derivasi status: sedikit di luar → perhatian; jauh di luar → segera', () => {
    // span normal = 29; dist 126-99=27 < 14.5? tidak → 27 > 14.5 → segera
    expect(calibrationScale({ ...base, value: 110 }).status).toBe('perhatian'); // dist 11 < 14.5
    expect(calibrationScale({ ...base, value: 140 }).status).toBe('segera'); // dist 41 > 14.5
  });

  it('status eksplisit menimpa derivasi', () => {
    expect(calibrationScale({ ...base, value: 85, status: 'segera' }).status).toBe('segera');
  });

  it('melempar bila scaleMax <= scaleMin', () => {
    expect(() => calibrationScale({ value: 5, scaleMin: 100, scaleMax: 50 })).toThrow();
  });

  it('tanpa pita normal tetap menghasilkan SVG (status default normal)', () => {
    const r = calibrationScale({ value: 50, scaleMin: 0, scaleMax: 100 });
    expect(r.status).toBe('normal');
    expect(r.svg).toContain('<svg');
  });

  it('tidak ada NaN/undefined yang bocor ke SVG', () => {
    const { svg } = calibrationScale({ ...base, value: 126 });
    expect(svg).not.toContain('NaN');
    expect(svg).not.toContain('undefined');
  });
});
