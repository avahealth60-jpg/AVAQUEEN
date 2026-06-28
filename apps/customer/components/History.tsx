// Server component — riwayat & tren (data via RLS, hanya milik pengguna).
import React from 'react';
import { readings, trends } from '../lib/data';
import { TriagePill, Sparkline } from './widgets';

function fmt(ts: string) {
  return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export async function History() {
  const [rows, tr] = await Promise.all([readings(), trends()]);
  if (rows.length === 0) {
    return <div className="card"><div className="empty"><strong>Belum ada riwayat</strong>Catat pemeriksaan pertamamu di atas.</div></div>;
  }
  return (
    <>
      {tr.length > 0 && (
        <>
          <div className="section-h">Tren</div>
          <div className="card">
            {tr.map((t) => {
              const last = t.points[t.points.length - 1]!;
              return (
                <div className="trend" key={t.type}>
                  <div className="trend__head">
                    <span className="trend__label">{t.label}</span>
                    <span className="trend__last">{last.n}<span className="u"> {t.unit}</span></span>
                  </div>
                  <Sparkline values={t.points.map((p) => p.n)} triages={t.points.map((p) => p.triage)} />
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="section-h">Riwayat</div>
      <div className="card">
        {rows.map((r) => (
          <div className="read" key={r.id}>
            <div className="read__main">
              <div className="read__label">{r.label}</div>
              <div className="read__meta">{fmt(r.takenAt)}</div>
            </div>
            <div className="read__val">{r.display}<span className="read__unit">{r.unit}</span></div>
            <TriagePill triage={r.triage} />
          </div>
        ))}
      </div>
    </>
  );
}
