import { describe, it, expect } from 'vitest';
import {
  palette,
  triageColor,
  qcStatusColor,
  badgeStatusColor,
  resolveTriage,
  resolveQc,
  generateTokensCss,
} from '../index.js';
import { typography } from '../scale.js';

const HEX = /^#[0-9A-Fa-f]{6}$/;

describe('token warna', () => {
  it('semua nilai palette adalah hex 6 digit valid', () => {
    for (const [k, v] of Object.entries(palette)) {
      expect(v, `palette.${k}`).toMatch(HEX);
    }
  });

  it('setiap status triase/qc/badge punya fg, bg, label', () => {
    for (const map of [triageColor, qcStatusColor, badgeStatusColor]) {
      for (const [k, v] of Object.entries(map)) {
        expect(v.fg, `${k}.fg`).toMatch(HEX);
        expect(v.bg, `${k}.bg`).toMatch(HEX);
        expect(v.label.length, `${k}.label`).toBeGreaterThan(0);
      }
    }
  });

  it('triase normal & qc lulus berbagi warna sehat yang sama (konsistensi semantik)', () => {
    expect(triageColor.normal.fg).toBe(qcStatusColor.lulus.fg);
    expect(triageColor.segera.fg).toBe(qcStatusColor.gagal.fg);
  });
});

describe('resolver status', () => {
  it('resolveTriage mengembalikan token untuk level valid', () => {
    expect(resolveTriage('perhatian').label).toBe('Perlu perhatian');
  });
  it('resolveTriage melempar untuk level tak dikenal', () => {
    expect(() => resolveTriage('meledak')).toThrow(/Triase tak dikenal/);
  });
  it('resolveQc melempar untuk hasil tak dikenal', () => {
    expect(() => resolveQc('mungkin')).toThrow(/Hasil QC tak dikenal/);
  });
});

describe('skala tipografi', () => {
  it('fontSize naik monoton dari xs ke 4xl (dalam rem)', () => {
    const order = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'] as const;
    const rem = order.map((k) => parseFloat(typography.fontSize[k]));
    for (let i = 1; i < rem.length; i++) {
      expect(rem[i], `${order[i]} > ${order[i - 1]}`).toBeGreaterThan(rem[i - 1]);
    }
  });

  it('mono diset untuk angka (bahasa alat ukur)', () => {
    expect(typography.fontFamily.mono).toMatch(/JetBrains Mono/);
  });
});

describe('generateTokensCss', () => {
  const css = generateTokensCss();

  it('membuka :root dan menutup blok', () => {
    expect(css.startsWith(':root {')).toBe(true);
    expect(css.trimEnd().endsWith('}')).toBe(true);
  });

  it('memuat SETIAP warna palette sebagai CSS variable', () => {
    for (const v of Object.values(palette)) {
      expect(css).toContain(v);
    }
  });

  it('memuat variabel triase, qc, dan badge', () => {
    expect(css).toContain('--ava-triage-segera-fg');
    expect(css).toContain('--ava-qc-lulus-bg');
    expect(css).toContain('--ava-badge-active-fg');
  });

  it('memuat token mono & spacing', () => {
    expect(css).toContain('--ava-font-mono');
    expect(css).toContain('--ava-space-4');
  });

  it('tidak ada nilai undefined yang bocor ke output', () => {
    expect(css).not.toContain('undefined');
  });

  it('regresi: nama variabel tidak memecah antar-digit', () => {
    expect(css).toContain('--ava-color-ink-900:');
    expect(css).toContain('--ava-color-surface-50:');
    expect(css).toContain('--ava-color-trust-500:');
    expect(css).toContain('--ava-color-line-strong:');
    expect(css).not.toContain('ink-90-0');
    expect(css).toContain('--ava-qc-perlu-tinjau-fg');
  });
});
