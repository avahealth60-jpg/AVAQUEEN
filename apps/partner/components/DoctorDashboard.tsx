// Server component — dashboard dokter: konsultasi + hasil dibagikan + pendapatan.
import React from 'react';
import { doctorConsultations, doctorEarnings } from '../lib/consult';
import { PageHead, Empty } from './widgets';
import { ConfirmForm, CompleteButton, DeclineButton } from './ConsultActions';
import { NoteForm } from './NoteForm';
import { ChatBox } from './ChatBox';

const rupiah = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const STATUS: Record<string, [string, string]> = {
  requested: ['pill pill--warn', 'Permintaan baru'],
  confirmed: ['pill pill--ok', 'Terjadwal'],
  completed: ['pill pill--mute', 'Selesai'],
  cancelled: ['pill pill--mute', 'Dibatalkan'],
};
const triageCls: Record<string, string> = { normal: 'pill--ok', perhatian: 'pill--warn', segera: 'pill--bad' };

export async function DoctorDashboard({ name }: { name: string | null }) {
  const [list, earn] = await Promise.all([doctorConsultations(), doctorEarnings()]);
  const active = list.filter((c) => c.status === 'requested' || c.status === 'confirmed');
  const past = list.filter((c) => c.status === 'completed' || c.status === 'cancelled');

  return (
    <>
      <PageHead eyebrow="Dokter" title={name ? `Praktik · ${name}` : 'Konsultasi'}
        sub="Permintaan konsultasi, hasil yang dibagikan pasien, dan pendapatanmu." />

      <div className="tiles">
        <div className="tile"><div className="tile__label">Permintaan & terjadwal</div><div className="tile__num">{active.length}</div></div>
        <div className="tile"><div className="tile__label">Selesai</div><div className="tile__num">{earn.completed}</div></div>
        <div className="tile"><div className="tile__label">Pendapatan bersih</div><div className="tile__num" style={{ fontSize: 22 }}>{rupiah(earn.net)}</div></div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card__title">Konsultasi aktif</div>
        {active.length === 0 ? <Empty title="Tidak ada konsultasi aktif" hint="Permintaan dari pasien akan muncul di sini." /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {active.map((c) => {
              const [cls, label] = STATUS[c.status] ?? ['pill pill--mute', c.status];
              return (
                <div key={c.id} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <strong>{c.patientName}</strong><span className={cls}>{label}</span>
                  </div>
                  {c.sharedReadings.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {c.sharedReadings.map((r) => (
                        <span key={r.id} className={`pill ${r.triage ? triageCls[r.triage] : 'pill--mute'}`}>
                          {r.type}: {r.display}
                        </span>
                      ))}
                    </div>
                  ) : <div className="hint" style={{ marginBottom: 8 }}>Tidak ada hasil dibagikan.</div>}

                  {c.status === 'requested' && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <ConfirmForm id={c.id} />
                      <DeclineButton id={c.id} />
                    </div>
                  )}
                  {c.status === 'confirmed' && (
                    <div>
                      {c.scheduledAt && <div className="hint">Jadwal: {new Date(c.scheduledAt).toLocaleString('id-ID')}</div>}
                      {c.joinUrl && <div style={{ margin: '6px 0' }}><a className="link" href={c.joinUrl} target="_blank" rel="noreferrer">Buka ruang konsultasi →</a></div>}
                      <NoteForm id={c.id} initial={c.doctorNote} />
                      <ChatBox consultationId={c.id} />
                      <div style={{ marginTop: 8 }}><CompleteButton id={c.id} /></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card__title">Riwayat</div>
        {past.length === 0 ? <Empty title="Belum ada riwayat" hint="Konsultasi selesai akan tercatat di sini." /> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Pasien</th><th>Status</th><th>Tarif</th></tr></thead>
              <tbody>
                {past.map((c) => (
                  <tr key={c.id}><td>{c.patientName}</td>
                    <td><span className={STATUS[c.status]?.[0] ?? 'pill pill--mute'}>{STATUS[c.status]?.[1] ?? c.status}</span></td>
                    <td className="mono">{rupiah(c.fee)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
