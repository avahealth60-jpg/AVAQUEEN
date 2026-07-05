// Server component — armada vendor + form daftar alat. Data via RLS (klien sesi).
import React from 'react';
import { reminderStatus, badgeStatus } from '@ava/domain';
import { vendorFleet, deviceModels } from '../lib/data';
import { PageHead, QcTag, DueTag, BadgeTag, Empty } from './widgets';
import { RegisterDeviceForm } from './RegisterDeviceForm';
import { PublishListingForm } from './PublishListingForm';

export async function VendorDashboard({ orgName }: { orgName: string | null }) {
  const now = new Date();
  const [rows, models] = await Promise.all([vendorFleet(), deviceModels()]);
  const verified = rows.filter((r) => r.badgeExpiresAt && badgeStatus(new Date(r.badgeExpiresAt), now) === 'active').length;
  const dueSoon = rows.filter((r) => r.nextDueAt && reminderStatus(new Date(r.nextDueAt), now) !== 'ok').length;

  return (
    <>
      <PageHead eyebrow="Vendor" title={orgName ? `Armada · ${orgName}` : 'Armada alat'}
        sub="Alat yang kamu daftarkan, status QC, dan badge AVA Verified-nya." />

      <div className="tiles">
        <div className="tile"><div className="tile__label">Total alat</div><div className="tile__num">{rows.length}</div></div>
        <div className="tile"><div className="tile__label">Badge aktif</div><div className="tile__num">{verified}</div></div>
        <div className={`tile ${dueSoon ? 'tile--warn' : ''}`}><div className="tile__label">Perlu kalibrasi</div><div className="tile__num">{dueSoon}</div></div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="card__title">Armada</div>
          {rows.length === 0 ? (
            <Empty title="Belum ada alat" hint="Daftarkan alat pertamamu lewat formulir di samping." />
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Serial</th><th>Model</th><th>QC</th><th>Jatuh tempo</th><th>Badge</th></tr></thead>
                <tbody>
                  {rows.map((r) => {
                    const due = r.nextDueAt ? reminderStatus(new Date(r.nextDueAt), now) : null;
                    const active = r.badgeExpiresAt ? badgeStatus(new Date(r.badgeExpiresAt), now) === 'active' : false;
                    return (
                      <tr key={r.deviceId}>
                        <td className="mono">{r.serial}</td>
                        <td>{r.modelName}</td>
                        <td><QcTag qc={r.qc} /></td>
                        <td><DueTag status={due} date={r.nextDueAt} /></td>
                        <td><BadgeTag active={active} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="card">
          <div className="card__title">Daftarkan alat baru</div>
          <RegisterDeviceForm models={models} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card__title">Etalase toko (jual alat ber-badge)</div>
        <p className="hint" style={{ marginBottom: 12 }}>
          Tayangkan alatmu ke masyarakat. Listing dari model yang punya badge
          AVA Verified aktif tampil bertanda terverifikasi otomatis.
        </p>
        <PublishListingForm models={models} />
      </div>
    </>
  );
}
