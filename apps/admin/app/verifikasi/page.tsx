// apps/admin/app/verifikasi/page.tsx — Verifikasi dokter (STR/SIP).
import React from 'react';
import { doctorsForVerification, isConfigured } from '../../lib/data';
import { PageHead, ConnBanner, Empty } from '../../components/widgets';
import { VerifyButtons } from '../../components/VerifyButtons';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, [string, string]> = {
  pending: ['pill pill--warn', 'Menunggu'],
  verified: ['pill pill--ok', 'Terverifikasi'],
  rejected: ['pill pill--bad', 'Ditolak'],
};

export default async function VerifikasiPage() {
  const docs = await doctorsForVerification();
  const pending = docs.filter((d) => d.status === 'pending').length;
  const verified = docs.filter((d) => d.status === 'verified').length;

  return (
    <>
      <PageHead
        eyebrow="Kepercayaan · Verifikasi"
        title="Verifikasi dokter"
        sub="Tinjau STR/SIP. Hanya dokter terverifikasi yang tampil untuk dibooking pasien." />
      {!isConfigured() && <ConnBanner />}

      <div className="tiles">
        <div className={`tile ${pending ? 'tile--warn' : ''}`}><div className="tile__label">Menunggu</div><div className="tile__num">{pending}</div></div>
        <div className="tile"><div className="tile__label">Terverifikasi</div><div className="tile__num">{verified}</div></div>
        <div className="tile"><div className="tile__label">Total dokter</div><div className="tile__num">{docs.length}</div></div>
      </div>

      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Nama</th><th>STR</th><th>SIP</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>
            {docs.length === 0 ? (
              <tr><td colSpan={5}><Empty title="Belum ada dokter" hint="Dokter mendaftar lewat portal mitra, lalu muncul di sini." /></td></tr>
            ) : docs.map((d) => {
              const [cls, label] = STATUS[d.status] ?? ['pill pill--mute', d.status];
              return (
                <tr key={d.id}>
                  <td style={{ fontWeight: 600 }}>{d.name}</td>
                  <td className="mono">{d.strNo ?? '—'}</td>
                  <td className="mono">{d.sipNo ?? '—'}</td>
                  <td><span className={cls}>{label}</span></td>
                  <td><VerifyButtons id={d.id} status={d.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
