// apps/admin/app/page.tsx — Ringkasan: kondisi armada sekarang + antrian tindakan.
import React from 'react';
import Link from 'next/link';
import { stats, fleet, isConfigured } from '../lib/data';
import { deriveAll } from '../lib/derive';
import { PageHead, QcTag, DueTag, ConnBanner, Empty } from '../components/widgets';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const now = new Date();
  const configured = isConfigured();
  const [s, rows] = await Promise.all([stats(now), fleet()]);
  const queue = deriveAll(rows, now).filter((r) => r.needsAction).slice(0, 8);

  return (
    <>
      <PageHead
        eyebrow="Operasi · Ringkasan"
        title="Kondisi armada"
        sub="Pantau kalibrasi, QC, dan badge seluruh alat mitra dalam satu pandangan."
      />
      {!configured && <ConnBanner />}

      <div className="tiles">
        <div className="tile">
          <div className="tile__label">Alat terdaftar</div>
          <div className="tile__num">{s.devices}</div>
          <div className="tile__foot">{s.vendors} vendor · {s.labs} lab</div>
        </div>
        <div className={`tile ${s.overdueCalibrations ? 'tile--alert' : ''}`}>
          <div className="tile__label">Kalibrasi lewat tempo</div>
          <div className="tile__num">{s.overdueCalibrations}</div>
          <div className="tile__foot">butuh tindakan segera</div>
        </div>
        <div className={`tile ${s.dueSoonCalibrations ? 'tile--warn' : ''}`}>
          <div className="tile__label">Jatuh tempo ≤ 30 hari</div>
          <div className="tile__num">{s.dueSoonCalibrations}</div>
          <div className="tile__foot">jadwalkan ulang</div>
        </div>
        <div className="tile">
          <div className="tile__label">Badge AVA aktif</div>
          <div className="tile__num">{s.activeBadges}</div>
          <div className="tile__foot">dari {s.devices} alat</div>
        </div>
      </div>

      <div className="card">
        <div className="card__title">Antrian tindakan</div>
        {queue.length === 0 ? (
          <Empty
            title={configured ? 'Semua alat aman' : 'Belum ada data'}
            hint={configured
              ? 'Tidak ada kalibrasi lewat tempo, QC gagal, atau badge mati.'
              : 'Sambungkan Supabase untuk melihat armada mitra.'}
          />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Serial</th><th>Model</th><th>Vendor</th>
                  <th>QC</th><th>Jatuh tempo</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((r) => (
                  <tr key={r.deviceId}>
                    <td className="mono">{r.serial}</td>
                    <td>{r.modelName}</td>
                    <td>{r.vendorName}</td>
                    <td><QcTag qc={r.qc} /></td>
                    <td><DueTag status={r.due} date={r.nextDueAt} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {queue.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Link className="link" href="/qc">Lihat semua di Monitoring QC →</Link>
          </div>
        )}
      </div>
    </>
  );
}
