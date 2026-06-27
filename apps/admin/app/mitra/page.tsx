// apps/admin/app/mitra/page.tsx — Direktori mitra (vendor, lab, faskes).
import React from 'react';
import { partners, isConfigured } from '../../lib/data';
import { PageHead, KindTag, ConnBanner, Empty } from '../../components/widgets';

export const dynamic = 'force-dynamic';

export default async function MitraPage() {
  const rows = await partners();
  const byKind = (k: string) => rows.filter((r) => r.kind === k).length;
  return (
    <>
      <PageHead
        eyebrow="Jaringan · Mitra"
        title="Direktori mitra"
        sub="Vendor alkes, lab kalibrasi, dan faskes yang menjadi simpul kepercayaan AVA."
      />
      {!isConfigured() && <ConnBanner />}

      <div className="tiles">
        <div className="tile"><div className="tile__label">Vendor</div><div className="tile__num">{byKind('vendor')}</div></div>
        <div className="tile"><div className="tile__label">Lab kalibrasi</div><div className="tile__num">{byKind('lab')}</div></div>
        <div className="tile"><div className="tile__label">Faskes</div><div className="tile__num">{byKind('faskes')}</div></div>
        <div className="tile"><div className="tile__label">Total mitra</div><div className="tile__num">{rows.length}</div></div>
      </div>

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr><th>Nama</th><th>Jenis</th><th>Anggota</th><th>Alat</th><th>Kalibrasi</th><th>Bergabung</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6}><Empty title="Belum ada mitra" hint="Daftarkan vendor & lab untuk memulai alur QC." /></td></tr>
            ) : rows.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.name}</td>
                <td><KindTag kind={r.kind} /></td>
                <td className="mono">{r.memberCount}</td>
                <td className="mono">{r.kind === 'vendor' ? r.deviceCount : '—'}</td>
                <td className="mono">{r.kind === 'lab' ? r.calibrationCount : '—'}</td>
                <td className="mono" style={{ color: 'var(--muted)' }}>{r.createdAt.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
