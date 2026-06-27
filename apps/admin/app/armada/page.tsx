// apps/admin/app/armada/page.tsx — Inventaris seluruh alat terdaftar.
import React from 'react';
import { fleet, isConfigured } from '../../lib/data';
import { PageHead, QcTag, ConnBanner, Empty } from '../../components/widgets';

export const dynamic = 'force-dynamic';

export default async function ArmadaPage() {
  const rows = await fleet();
  return (
    <>
      <PageHead
        eyebrow="Operasi · Armada"
        title="Inventaris alat"
        sub="Seluruh alat mitra yang terdaftar di platform, beserta model dan status registrasi."
      />
      {!isConfigured() && <ConnBanner />}
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Serial</th><th>Model</th><th>Kategori</th>
              <th>Vendor</th><th>Status</th><th>Interval</th><th>QC terakhir</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7}><Empty title="Belum ada alat" hint="Vendor mendaftarkan alat lewat Partner Portal." /></td></tr>
            ) : rows.map((r) => (
              <tr key={r.deviceId}>
                <td className="mono">{r.serial}</td>
                <td>{r.modelName}</td>
                <td style={{ color: 'var(--muted)' }}>{r.category ?? '—'}</td>
                <td>{r.vendorName}</td>
                <td><span className="pill pill--mute">{r.status}</span></td>
                <td className="mono">{r.intervalMonths} bln</td>
                <td><QcTag qc={r.qc} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
