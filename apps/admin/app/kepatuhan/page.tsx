// apps/admin/app/kepatuhan/page.tsx — Kepatuhan UU PDP: consent & jejak audit.
import React from 'react';
import { consents, auditLogs, isConfigured } from '../../lib/data';
import { PageHead, ConnBanner, Empty } from '../../components/widgets';

export const dynamic = 'force-dynamic';

export default async function KepatuhanPage() {
  const [cs, logs] = await Promise.all([consents(), auditLogs(50)]);
  const granted = cs.filter((c) => c.status === 'granted').length;

  return (
    <>
      <PageHead
        eyebrow="Tata kelola · Kepatuhan"
        title="Consent & jejak audit"
        sub="Catatan persetujuan subjek data (UU PDP) dan log perubahan data sensitif yang dapat ditelusuri."
      />
      {!isConfigured() && <ConnBanner />}

      <div className="tiles">
        <div className="tile"><div className="tile__label">Consent aktif</div><div className="tile__num">{granted}</div></div>
        <div className="tile"><div className="tile__label">Total consent</div><div className="tile__num">{cs.length}</div></div>
        <div className="tile"><div className="tile__label">Entri audit</div><div className="tile__num">{logs.length}</div></div>
        <div className="tile"><div className="tile__label">Dicabut</div><div className="tile__num">{cs.length - granted}</div></div>
      </div>

      <div className="card" style={{ marginBottom: 22 }}>
        <div className="card__title">Catatan consent</div>
        {cs.length === 0 ? <Empty title="Belum ada consent" hint="Consent tercatat saat masyarakat menyetujui pemrosesan data." /> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Subjek data</th><th>Tujuan</th><th>Status</th><th>Diberikan</th></tr></thead>
              <tbody>
                {cs.map((c) => (
                  <tr key={c.id}>
                    <td>{c.customerName ?? <span className="mono" style={{ color: 'var(--muted)' }}>{c.customer_id.slice(0, 8)}</span>}</td>
                    <td className="mono">{c.purpose}</td>
                    <td><span className={`pill ${c.status === 'granted' ? 'pill--ok' : 'pill--mute'}`}>{c.status === 'granted' ? 'Diberikan' : 'Dicabut'}</span></td>
                    <td className="mono" style={{ color: 'var(--muted)' }}>{c.granted_at.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card__title">Jejak audit (50 terbaru)</div>
        {logs.length === 0 ? <Empty title="Belum ada entri audit" hint="Perubahan badge & akses data sensitif tercatat otomatis lewat trigger." /> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Waktu</th><th>Aksi</th><th>Entitas</th><th>Aktor</th></tr></thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="mono" style={{ color: 'var(--muted)' }}>{l.created_at.slice(0, 19).replace('T', ' ')}</td>
                    <td className="mono">{l.action}</td>
                    <td>{l.entity}{l.entity_id ? <span className="mono" style={{ color: 'var(--muted)' }}> · {l.entity_id.slice(0, 8)}</span> : ''}</td>
                    <td className="mono" style={{ color: 'var(--muted)' }}>{l.actor_id ? l.actor_id.slice(0, 8) : 'sistem'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
