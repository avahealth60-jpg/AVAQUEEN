// apps/customer/app/konsultasi/page.tsx — booking + daftar konsultasi.
import React from 'react';
import { getCustomerAuth } from '../../lib/auth';
import { doctors, shareableReadings, myConsultations } from '../../lib/consult';
import { RatingForm } from '../../components/RatingForm';
import { ChatBox } from '../../components/ChatBox';
import { ConsultBooking } from '../../components/ConsultBooking';
import { ConnBanner } from '../../components/ConnBanner';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, { label: string; cls: string }> = {
  requested: { label: 'Menunggu konfirmasi', cls: 'perhatian' },
  confirmed: { label: 'Terjadwal', cls: 'normal' },
  completed: { label: 'Selesai', cls: 'none' },
  cancelled: { label: 'Dibatalkan', cls: 'none' },
};

export default async function Konsultasi({ searchParams }: { searchParams: { share?: string } }) {
  const { configured } = await getCustomerAuth();
  if (!configured) return <div className="screen"><ConnBanner /></div>;

  const [docs, readings, list] = await Promise.all([doctors(), shareableReadings(), myConsultations()]);

  return (
    <div className="screen">
      <header className="phead">
        <p className="phead__kicker">Konsultasi</p>
        <h1 className="phead__title">Bicara dengan dokter</h1>
        <p className="phead__sub">Ajukan sesi dan bagikan hasil pemeriksaan pilihanmu — aman & atas persetujuanmu.</p>
      </header>

      {docs.length > 0 && (
        <>
          <div className="section-h">Dokter tersedia</div>
          {docs.slice(0, 4).map((d) => (
            <div className="doc" key={d.id}>
              <div className="doc__avatar">{(d.name?.replace(/^dr\.?\s*/i, '')[0] ?? 'D').toUpperCase()}</div>
              <div className="doc__main">
                <div className="doc__name">{d.name}</div>
                <div className="doc__spec">Dokter umum · konsultasi teks</div>
                <span className="doc__online">Tersedia hari ini</span>
              </div>
            </div>
          ))}
        </>
      )}

      <div className="section-h">Ajukan konsultasi</div>
      <div className="card"><ConsultBooking doctors={docs} readings={readings} preselect={searchParams.share} /></div>

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
                  {c.doctorNote && (
                    <div className="result result--normal" style={{ marginTop: 8 }}>
                      <span className="result__tag">Catatan dokter</span>
                      <p className="result__text" style={{ whiteSpace: 'pre-wrap' }}>{c.doctorNote}</p>
                    </div>
                  )}
                  {(c.status === 'confirmed' || c.status === 'completed') && <ChatBox consultationId={c.id} />}
                  {c.status === 'completed' && <RatingForm id={c.id} current={c.rating} />}
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
