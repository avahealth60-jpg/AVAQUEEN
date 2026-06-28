// apps/customer/components/widgets.tsx
import React from 'react';
import type { Triage } from '@ava/domain';

const TRIAGE: Record<Triage, { label: string; cls: string }> = {
  normal: { label: 'Normal', cls: 'normal' },
  perhatian: { label: 'Perlu perhatian', cls: 'perhatian' },
  segera: { label: 'Segera periksa', cls: 'segera' },
};

export function TriagePill({ triage }: { triage: Triage | null }) {
  if (!triage) return <span className="pill pill--none">—</span>;
  const t = TRIAGE[triage];
  return <span className={`pill pill--${t.cls}`}>{t.label}</span>;
}

export function triageMeta(triage: Triage) { return TRIAGE[triage]; }

// Sparkline SVG murni — tanpa dependensi, ringan untuk PWA.
export function Sparkline({ values, triages }: { values: number[]; triages: (Triage | null)[] }) {
  const w = 240, h = 44, pad = 4;
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => pad + (i * (w - 2 * pad)) / (values.length - 1);
  const y = (v: number) => h - pad - ((v - min) / span) * (h - 2 * pad);
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const lastTriage = triages[triages.length - 1] ?? 'normal';
  const color = lastTriage === 'segera' ? 'var(--segera)' : lastTriage === 'perhatian' ? 'var(--perhatian)' : 'var(--brand)';
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Tren">
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === values.length - 1 ? 3 : 1.8} fill={color} />
      ))}
    </svg>
  );
}
