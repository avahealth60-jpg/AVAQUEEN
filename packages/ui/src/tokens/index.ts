/**
 * AVA Health — Token index & generator CSS variables (V1.1.0)
 *
 * Satu sumber kebenaran (TS) → di-emit ke CSS custom properties.
 * Komponen memakai var(--ava-*) sehingga theming & dark-readout bisa
 * diganti tanpa menyentuh komponen. (Modularitas: ganti lapisan tanpa bongkar inti.)
 */
import { palette, triageColor, qcStatusColor, badgeStatusColor } from './colors.js';
import { typography, spacing, radius, elevation, motion } from './scale.js';

export * from './colors.js';
export * from './scale.js';

function camelToKebab(s: string): string {
  // Sisipkan hyphen HANYA di batas: huruf-kecil→huruf-besar, dan huruf→digit.
  // Jangan memotong antar-digit (ink900 → ink-900, bukan ink-90-0).
  return s
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])([0-9])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

/**
 * Emit seluruh token sebagai blok CSS :root.
 * Murni (pure) & deterministik — gampang diuji & dibandingkan antar build.
 */
export function generateTokensCss(): string {
  const lines: string[] = [':root {'];

  lines.push('  /* warna */');
  for (const [k, v] of Object.entries(palette)) {
    lines.push(`  --ava-color-${camelToKebab(k)}: ${v};`);
  }

  lines.push('  /* status: triase */');
  for (const [k, v] of Object.entries(triageColor)) {
    lines.push(`  --ava-triage-${camelToKebab(k)}-fg: ${v.fg};`);
    lines.push(`  --ava-triage-${camelToKebab(k)}-bg: ${v.bg};`);
  }

  lines.push('  /* status: qc */');
  for (const [k, v] of Object.entries(qcStatusColor)) {
    lines.push(`  --ava-qc-${camelToKebab(k)}-fg: ${v.fg};`);
    lines.push(`  --ava-qc-${camelToKebab(k)}-bg: ${v.bg};`);
  }

  lines.push('  /* status: badge */');
  for (const [k, v] of Object.entries(badgeStatusColor)) {
    lines.push(`  --ava-badge-${camelToKebab(k)}-fg: ${v.fg};`);
    lines.push(`  --ava-badge-${camelToKebab(k)}-bg: ${v.bg};`);
  }

  lines.push('  /* tipografi */');
  for (const [k, v] of Object.entries(typography.fontFamily)) {
    lines.push(`  --ava-font-${camelToKebab(k)}: ${v};`);
  }
  for (const [k, v] of Object.entries(typography.fontSize)) {
    lines.push(`  --ava-text-${k}: ${v};`);
  }

  lines.push('  /* spacing */');
  for (const [k, v] of Object.entries(spacing)) {
    lines.push(`  --ava-space-${k}: ${v};`);
  }

  lines.push('  /* radius */');
  for (const [k, v] of Object.entries(radius)) {
    lines.push(`  --ava-radius-${k}: ${v};`);
  }

  lines.push('  /* elevasi */');
  for (const [k, v] of Object.entries(elevation)) {
    lines.push(`  --ava-elevation-${k}: ${v};`);
  }

  lines.push('  /* motion */');
  for (const [k, v] of Object.entries(motion)) {
    lines.push(`  --ava-motion-${camelToKebab(k)}: ${v};`);
  }

  lines.push('}');
  return lines.join('\n');
}
