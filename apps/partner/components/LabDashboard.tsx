// Server component — antrian alat + form catat kalibrasi/QC. Data via RLS.
import React from 'react';
import { labDevices } from '../lib/data';
import { PageHead, BadgeTag, Empty } from './widgets';
import { SubmitCalibrationForm } from './SubmitCalibrationForm';

export async function LabDashboard({ orgName }: { orgName: string | null }) {
  const devices = await labDevices();
  const verified = devices.filter((d) => d.badgeActive).length;

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
    </>
  );
}
