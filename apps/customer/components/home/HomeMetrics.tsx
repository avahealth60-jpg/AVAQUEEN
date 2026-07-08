// apps/customer/components/home/HomeMetrics.tsx — kartu metrik + mini sparkline.
import React from 'react';
import type { HomeMetric } from '../../lib/data';

function Icon({ id }: { id: string }) {
  const p = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (id) {
    case 'heart': return <svg {...p}><path d="M20.8 8.6a5 5 0 0 0-8.8-3 5 5 0 0 0-8.8 3c0 4 4.5 7.5 8.8 10.9 4.3-3.4 8.8-6.9 8.8-10.9z" /></svg>;
    case 'moon': return <svg {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>;
    case 'steps': return <svg {...p}><path d="M7 20c-2 0-3-1.4-3-4 0-3 1-5 1-8a2 2 0 0 1 4 0c0 3-1 5-1 8 0 2.6-1 4-1 4z" /><path d="M17 20c2 0 3-1.4 3-4 0-3-1-5-1-8a2 2 0 0 0-4 0c0 3 1 5 1 8 0 2.6 1 4 1 4z" /></svg>;
    case 'drop': return <svg {...p}><path d="M12 3s6 6.4 6 10.5A6 6 0 0 1 6 13.5C6 9.4 12 3 12 3z" /></svg>;
    default: return <svg {...p}><circle cx="12" cy="12" r="8" /></svg>;
  }
}

const COLOR: Record<string, string> = { heart: '#FF7A9A', moon: '#8B93FF', steps: '#14B89A', drop: '#4CC9F0' };

function MiniSpark({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <div style={{ height: 22 }} />;
  const w = 90, h = 22, min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const x = (i: number) => (i * w) / (values.length - 1);
  const y = (v: number) => h - 2 - ((v - min) / span) * (h - 4);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="22" preserveAspectRatio="none" aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const TRIAGE_LABEL: Record<string, string> = { normal: 'Normal', perhatian: 'Perhatian', segera: 'Segera' };

export function HomeMetrics({ metrics }: { metrics: HomeMetric[] }) {
  return (
    <div className="metric-grid">
      {metrics.map((m) => {
        const color = COLOR[m.icon] ?? 'var(--brand)';
        return (
          <div className="metric-card" key={m.key}>
            <div className="metric-card__ic" style={{ color }}><Icon id={m.icon} /></div>
            <div className="metric-card__label">{m.label}</div>
            <div className="metric-card__val">{m.value}{m.unit && <span className="metric-card__unit"> {m.unit}</span>}</div>
            {m.hasData ? (
              <>
                <MiniSpark values={m.series} color={color} />
                {m.triage && <div className="metric-card__sub" style={{ color: m.triage === 'normal' ? 'var(--normal)' : m.triage === 'perhatian' ? 'var(--perhatian)' : 'var(--segera)' }}>{TRIAGE_LABEL[m.triage]}</div>}
              </>
            ) : <div className="metric-card__sub">Belum ada data</div>}
          </div>
        );
      })}
    </div>
  );
}
