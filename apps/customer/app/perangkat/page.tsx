// apps/customer/app/perangkat/page.tsx — hubungkan smartwatch & lihat aktivitas.
import React from 'react';
import Link from 'next/link';
import { getCustomerAuth } from '../../lib/auth';
import { wearableConnections, wearableTrends } from '../../lib/data';
import { ConnBanner } from '../../components/ConnBanner';
import { WearableConnect } from '../../components/WearableConnect';
import { Sparkline } from '../../components/widgets';

export const dynamic = 'force-dynamic';

function fmt(ts: string | null) {
  if (!ts) return 'belum pernah';
  return new Date(ts).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default async function PerangkatPage() {
  const { configured } = await getCustomerAuth();
  if (!configured) return <div className="screen"><ConnBanner /></div>;

  const [conns, tr] = await Promise.all([wearableConnections(), wearableTrends()]);
  const active = conns.filter((c) => c.status === 'active');

  return (
    <div className="screen">
      <header style={{ marginBottom: 'var(--ava-space-5)' }}>
        <p style={{
          fontFamily: 'var(--ava-font-mono)', fontSize: 'var(--ava-text-xs)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--ava-color-trust-600)', margin: 0,
        }}>
          Perangkat
        </p>
        <h1 style={{
          fontFamily: 'var(--ava-font-display)', fontSize: 'var(--ava-text-2xl)',
          fontWeight: 600, color: 'var(--ava-color-ink-900)', margin: '4px 0 0',
        }}>
          Smartwatch & wearable
        </h1>
      </header>

      <WearableConnect connectedProviders={active.map((c) => c.provider)} />

      {active.length > 0 && (
        <>
          <div className="section-h">Koneksi</div>
          <div className="card">
            {active.map((c) => (
              <div className="read" key={c.provider}>
                <div className="read__main">
                  <div className="read__label">{c.provider}</div>
                  <div className="read__meta">Sinkron terakhir: {fmt(c.lastSyncAt)}</div>
                </div>
                <span className="pill pill--normal">Aktif</span>
              </div>
            ))}
          </div>
        </>
      )}

      {tr.length > 0 ? (
        <>
          <div className="section-h">Aktivitas dari perangkat</div>
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
      ) : (
        active.length > 0 && (
          <div className="card">
            <div className="empty"><strong>Belum ada data</strong>Tekan "Sinkron sekarang" untuk menarik aktivitas terbaru.</div>
          </div>
        )
      )}

      <p style={{ marginTop: 16 }}>
        <Link className="btn btn--ghost" href="/" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
          Kembali ke beranda
        </Link>
      </p>
    </div>
  );
}
