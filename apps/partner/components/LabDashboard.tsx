// Server component — antrian alat + form catat kalibrasi/QC. Data via RLS.
import React from 'react';
import { labDevices, labCalibrationHistory } from '../lib/data';
import { PageHead, BadgeTag, QcTag, Empty } from './widgets';
import { SubmitCalibrationForm } from './SubmitCalibrationForm';

const fmt = (ts: string) => (ts ? new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export async function LabDashboard({ orgName }: { orgName: string | null }) {
  const [devices, history] = await Promise.all([labDevices(), labCalibrationHistory()]);
  const verified = devices.filter((d) => d.badgeActive).length;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHead eyebrow="Lab kalibrasi" title={orgName ? `Kalibrasi · ${orgName}` : 'Kalibrasi'}
        sub="Catat hasil kalibrasi & QC alat. QC lulus otomatis menerbitkan badge AVA Verified." />

      <div className="tiles">
        <div className="tile"><div className="tile__label">Alat di platform</div><div className="tile__num">{devices.length}</div></div>
        <div className="tile"><div className="tile__label">Badge aktif</div><div className="tile__num">{verified}</div></div>
        <div className={`tile ${devices.length - verified ? 'tile--warn' : ''}`}><div className="tile__label">Belum terverifikasi</div><div className="tile__num">{devices.length - verified}</div></div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="card__title">Alat terdaftar</div>
          {devices.length === 0 ? (
            <Empty title="Belum ada alat" hint="Vendor mendaftarkan alat dulu, lalu muncul di sini untuk dikalibrasi." />
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Serial</th><th>Model</th><th>Interval</th><th>Status</th></tr></thead>
                <tbody>
                  {devices.map((d) => (
                    <tr key={d.id}>
                      <td className="mono">{d.serial}</td>
                      <td>{d.modelName}</td>
                      <td className="mono">{d.intervalMonths} bln</td>
                      <td><BadgeTag active={d.badgeActive} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="card">
          <div className="card__title">Catat kalibrasi & QC</div>
          <SubmitCalibrationForm devices={devices} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card__title">Riwayat kalibrasi</div>
        {history.length === 0 ? (
          <Empty title="Belum ada kalibrasi" hint="Kalibrasi yang kamu catat akan tercatat di sini." />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Serial</th><th>Dikalibrasi</th><th>Jatuh tempo</th><th>QC</th><th>Sertifikat</th></tr></thead>
              <tbody>
                {history.map((c) => {
                  const overdue = c.nextDueAt && c.nextDueAt.slice(0, 10) < today;
                  return (
                    <tr key={c.id}>
                      <td className="mono">{c.serial}</td>
                      <td className="mono">{fmt(c.performedAt)}</td>
                      <td className="mono" style={overdue ? { color: 'var(--bad)' } : undefined}>
                        {fmt(c.nextDueAt)}{overdue ? ' · lewat' : ''}
                      </td>
                      <td>{c.result ? <QcTag qc={c.result} /> : '—'}</td>
                      <td>{c.certificateUrl ? <a className="link" href={c.certificateUrl} target="_blank" rel="noreferrer">Lihat</a> : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
