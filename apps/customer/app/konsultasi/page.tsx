// apps/customer/app/konsultasi/page.tsx — booking + daftar konsultasi.
import React from 'react';
import { getCustomerAuth } from '../../lib/auth';
import { doctors, shareableReadings, myConsultations } from '../../lib/consult';
import { ConsultBooking } from '../../components/ConsultBooking';
import { ConnBanner } from '../../components/ConnBanner';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, { label: string; cls: string }> = {
  requested: { label: 'Menunggu konfirmasi', cls: 'perhatian' },
  confirmed: { label: 'Terjadwal', cls: 'normal' },
  completed: { label: 'Selesai', cls: 'none' },
  cancelled: { label: 'Dibatalkan', cls: 'none' },
};

export default async function Konsultasi() {
  const { configured } = await getCustomerAuth();
  if (!configured) return <div className="screen"><ConnBanner /></div>;

  const [docs, readings, list] = await Promise.all([doctors(), shareableReadings(), myConsultations()]);

  return (
    <div className="screen">
      <h1 className="hello">Konsultasi</h1>
      <p>Bicara dengan dokter dan bagikan hasil pilihanmu.</p>

      <div className="card"><ConsultBooking doctors={docs} readings={readings} /></div>

      <div className="section-h">Konsultasimu</div>
      {list.length === 0 ? (
        <div className="card"><div className="empty"><strong>Belum ada konsultasi</strong>Ajukan permintaan di atas.</div></div>
      ) : (
        <div className="card">
          {list.map((c) => {
            const s = STATUS[c.status] ?? { label: c.status, cls: 'none' };
            return (
              <div className="read" key={c.id}>
                <div className="read__main">
                  <div className="read__label">{c.doctorName}</div>
                  <div className="read__meta">
                    {c.sharedCount} hasil dibagikan
                    {c.scheduledAt ? ` · ${new Date(c.scheduledAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
                  </div>
                  {c.status === 'confirmed' && c.joinUrl && (
                    <a className="join" href={c.joinUrl} target="_blank" rel="noreferrer">Masuk ruang konsultasi →</a>
                  )}
                </div>
                <span className={`pill pill--${s.cls}`}>{s.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
