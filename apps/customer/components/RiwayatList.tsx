'use client';
// apps/customer/components/RiwayatList.tsx — riwayat lengkap + filter jenis + tren.
import React, { useMemo, useState } from 'react';
import { TriagePill, TrendChart } from './widgets';
import type { ReadingView, Trend } from '../lib/data';

function fmt(ts: string) {
  return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
const SRC_LABEL: Record<string, string> = {
  manual: 'Manual', health_connect: 'Health Connect', apple_health: 'Apple Health',
  fitbit: 'Fitbit', garmin: 'Garmin', zepp: 'Zepp', samsung_health: 'Samsung', manual_wearable: 'Perangkat',
};

export function RiwayatList({ readings, trends }: { readings: ReadingView[]; trends: Trend[] }) {
  const types = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of readings) m.set(r.type, r.label);
    return [...m.entries()];
  }, [readings]);
  const [type, setType] = useState('all');

  const rows = type === 'all' ? readings : readings.filter((r) => r.type === type);
  const shownTrends = type === 'all' ? trends : trends.filter((t) => t.type === type);

  if (readings.length === 0) {
    return <div className="card"><div className="empty"><strong>Belum ada riwayat</strong>Catat pemeriksaan pertamamu di Beranda.</div></div>;
  }

  return (
    <>
      {types.length > 1 && (
        <div className="field" style={{ marginBottom: 12 }}>
          <label>Filter jenis</label>
          <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">Semua jenis</option>
            {types.map(([t, label]) => <option key={t} value={t}>{label}</option>)}
          </select>
        </div>
      )}

      {shownTrends.length > 0 && (
        <>
          <div className="section-h">Tren</div>
          {shownTrends.map((t) => {
            const last = t.points[t.points.length - 1]!;
            return (
              <div className="card" key={t.type}>
                <div className="trend__head" style={{ marginBottom: 6 }}>
                  <span className="trend__label">{t.label}</span>
                  <span className="trend__last">{last.n}<span className="u"> {t.unit}</span></span>
                </div>
                <TrendChart values={t.points.map((p) => p.n)} unit={t.unit} />
              </div>
            );
          })}
        </>
      )}

      <div className="section-h">Riwayat ({rows.length})</div>
      <div className="card">
        {rows.map((r) => (
          <div className="read" key={r.id}>
            <div className="read__main">
              <div className="read__label">{r.label}</div>
              <div className="read__meta">{fmt(r.takenAt)} · {SRC_LABEL[r.source] ?? r.source}</div>
            </div>
            <div className="read__val">{r.display}<span className="read__unit">{r.unit}</span></div>
            <TriagePill triage={r.triage} />
          </div>
        ))}
      </div>
    </>
  );
}
