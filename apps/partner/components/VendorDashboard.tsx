// Server components — seksi vendor: Armada, Toko & pesanan, Jadwal kalibrasi.
import React from 'react';
import { reminderStatus, badgeStatus } from '@ava/domain';
import { vendorFleet, deviceModels, vendorListings, vendorOrders } from '../lib/data';
import { PageHead, QcTag, DueTag, BadgeTag, Empty } from './widgets';
import { RegisterDeviceForm } from './RegisterDeviceForm';
import { PublishListingForm } from './PublishListingForm';
import { VendorListings } from './VendorListings';
import { VendorOrders } from './VendorOrders';

// ── Armada (/) ───────────────────────────────────────────────────
export async function VendorFleet({ orgName }: { orgName: string | null }) {
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
    </>
  );
}

// ── Toko & pesanan (/toko) ───────────────────────────────────────
export async function VendorShop() {
  const [models, listings, orders] = await Promise.all([deviceModels(), vendorListings(), vendorOrders()]);
  const openOrders = orders.filter((o) => o.status === 'paid' || o.status === 'shipped').length;
  return (
    <>
      <PageHead eyebrow="Vendor · Toko" title="Etalase & pesanan"
        sub="Jual alat ber-badge ke masyarakat dan penuhi pesanan yang masuk." />
      <div className="grid2">
        <div className="card">
          <div className="card__title">Pesanan masuk{openOrders > 0 ? ` · ${openOrders} perlu diproses` : ''}</div>
          <VendorOrders orders={orders} />
        </div>
        <div className="card">
          <div className="card__title">Tayangkan alat baru</div>
          <p className="hint" style={{ marginBottom: 12 }}>Badge "AVA Verified" muncul otomatis bila model ini punya badge aktif.</p>
          <PublishListingForm models={models} />
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card__title">Etalase kamu</div>
        <VendorListings listings={listings} />
      </div>
    </>
  );
}

// ── Jadwal kalibrasi (/jadwal) ───────────────────────────────────
export async function VendorSchedule() {
  const now = new Date();
  const rows = await vendorFleet();
  const dated = rows.filter((r) => r.nextDueAt)
    .sort((a, b) => (a.nextDueAt! < b.nextDueAt! ? -1 : 1));
  const overdue = dated.filter((r) => reminderStatus(new Date(r.nextDueAt!), now) === 'overdue').length;

  return (
    <>
      <PageHead eyebrow="Vendor · Jadwal" title="Jadwal kalibrasi"
        sub="Unit yang menjelang atau lewat jatuh tempo — jadwalkan ke lab agar badge tetap aktif." />
      <div className="tiles">
        <div className="tile"><div className="tile__label">Punya jadwal</div><div className="tile__num">{dated.length}</div></div>
        <div className={`tile ${overdue ? 'tile--warn' : ''}`}><div className="tile__label">Lewat tempo</div><div className="tile__num">{overdue}</div></div>
      </div>
      <div className="card">
        <div className="card__title">Urut jatuh tempo</div>
        {dated.length === 0 ? (
          <Empty title="Belum ada jadwal" hint="Alat mendapat jadwal setelah kalibrasi pertama oleh lab." />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Serial</th><th>Model</th><th>Jatuh tempo</th></tr></thead>
              <tbody>
                {dated.map((r) => (
                  <tr key={r.deviceId}>
                    <td className="mono">{r.serial}</td>
                    <td>{r.modelName}</td>
                    <td><DueTag status={reminderStatus(new Date(r.nextDueAt!), now)} date={r.nextDueAt} /></td>
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
