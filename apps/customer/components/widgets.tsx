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

// Grafik tren area — SVG murni, bergradien, ringan. Untuk tampilan "keren".
export function TrendChart({ values, unit, height = 128 }: { values: number[]; unit?: string; height?: number }) {
  const w = 320, h = height, padX = 10, padTop = 18, padBottom = 22;
  if (values.length < 2) return <div className="hint">Butuh minimal 2 data untuk grafik.</div>;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const x = (i: number) => padX + (i * (w - 2 * padX)) / (values.length - 1);
  const y = (v: number) => padTop + (1 - (v - min) / span) * (h - padTop - padBottom);
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(values.length - 1).toFixed(1)},${h - padBottom} L${x(0).toFixed(1)},${h - padBottom} Z`;
  const gid = `tg${values.length}_${Math.round(min)}_${Math.round(max)}`;
  const last = values[values.length - 1]!;
  const grid = [0, 0.5, 1].map((t) => padTop + t * (h - padTop - padBottom));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Grafik tren" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid.map((gy, i) => (
        <line key={i} x1={padX} x2={w - padX} y1={gy} y2={gy} stroke="var(--line)" strokeWidth={1} strokeDasharray="2 5" />
      ))}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke="var(--brand)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === values.length - 1 ? 4 : 2}
          fill="var(--surface)" stroke="var(--brand)" strokeWidth={2} />
      ))}
      <text x={padX} y={12} fontSize={10} fill="var(--muted)">{max.toLocaleString('id-ID')}{unit ? ` ${unit}` : ''}</text>
      <text x={padX} y={h - 6} fontSize={10} fill="var(--muted)">{min.toLocaleString('id-ID')}</text>
      <text x={w - padX} y={Math.max(12, y(last) - 8)} fontSize={12} fontWeight={700} fill="var(--brand)" textAnchor="end">
        {last.toLocaleString('id-ID')}{unit ? ` ${unit}` : ''}
      </text>
    </svg>
  );
}

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
