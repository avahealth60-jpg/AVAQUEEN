// apps/admin/app/inspektur/page.tsx
// Inspektur peran (superadmin): "lihat sebagai" Customer / Vendor / Lab / Dokter.
// Read-only, ditenagai service-role yang sudah dimiliki konsol admin. Tidak
// melubangi RLS app lain — hanya menyajikan ulang data yang admin memang akses.
import React from 'react';
import Link from 'next/link';
import {
  fleet, isConfigured,
  customersList, doctorsList, vendorOrgs, labOrgs,
  inspectCustomerData, inspectDoctorData,
} from '../../lib/data';
import { PageHead, QcTag, DueTag, BadgeTag, ConnBanner, Empty } from '../../components/widgets';
import { reminderStatus, badgeStatus } from '@ava/domain';

export const dynamic = 'force-dynamic';

type View = 'customer' | 'vendor' | 'lab' | 'doctor';
const VIEWS: { key: View; label: string }[] = [
  { key: 'customer', label: 'Customer' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'lab', label: 'Lab' },
  { key: 'doctor', label: 'Dokter' },
];
const triageCls: Record<string, string> = { normal: 'pill--ok', perhatian: 'pill--warn', segera: 'pill--bad' };
const fmt = (ts: string) => (ts ? new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const rupiah = (n: number) => 'Rp ' + Number(n).toLocaleString('id-ID');

export default async function Inspektur({ searchParams }: { searchParams: { view?: string; id?: string } }) {
  if (!isConfigured()) return <><PageHead eyebrow="Superadmin" title="Inspektur peran" sub="" /><ConnBanner /></>;

  const view = (['customer', 'vendor', 'lab', 'doctor'].includes(searchParams.view ?? '') ? searchParams.view : 'customer') as View;
  const id = searchParams.id ?? '';

  // Daftar entitas untuk view aktif.
  const entities =
    view === 'customer' ? await customersList()
    : view === 'doctor' ? await doctorsList()
    : view === 'vendor' ? await vendorOrgs()
    : await labOrgs();

  const href = (v: View, eid?: string) => `/inspektur?view=${v}${eid ? `&id=${eid}` : ''}`;

  return (
    <>
      <PageHead
        eyebrow="Superadmin · Inspektur peran"
        title="Lihat sebagai"
        sub="Periksa alur tiap peran dari satu login. Tampilan read-only — untuk menjalankan aksi, gunakan akun peran tersebut." />

      <div className="seg" role="group" aria-label="Pilih peran">
        {VIEWS.map((v) => (
          <Link key={v.key} href={href(v.key)}>
            <button aria-pressed={view === v.key}>{v.label}</button>
          </Link>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card__title">
          {view === 'lab' ? 'Pilih lab (semua lab melihat antrian alat yang sama)' : `Pilih ${view}`}
        </div>
        {entities.length === 0 ? (
          <Empty title="Belum ada entitas" hint={`Belum ada ${view} di platform.`} />
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {entities.map((e) => (
              <Link key={e.id} href={href(view, e.id)}
                className={id === e.id ? 'pill pill--ok' : 'pill pill--mute'}
                style={{ textDecoration: 'none' }}>
                {e.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {id && <Panel view={view} id={id} />}
    </>
  );
}

async function Panel({ view, id }: { view: View; id: string }) {
  const now = new Date();

  if (view === 'vendor' || view === 'lab') {
    const all = await fleet();
    const rows = view === 'vendor' ? all.filter((r) => r.vendorId === id) : all;
    return (
      <div className="card">
        <div className="card__title">{view === 'vendor' ? 'Armada vendor ini' : 'Antrian alat (tampak lab)'}</div>
        {rows.length === 0 ? <Empty title="Tidak ada alat" hint="" /> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Serial</th><th>Model</th><th>QC</th><th>Jatuh tempo</th><th>Badge</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const due = r.nextDueAt ? reminderStatus(new Date(r.nextDueAt), now) : null;
                  const active = r.badgeExpiresAt ? badgeStatus(new Date(r.badgeExpiresAt), now) === 'active' : false;
                  return (
                    <tr key={r.deviceId}>
                      <td className="mono">{r.serial}</td><td>{r.modelName}</td>
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
    );
  }

  if (view === 'doctor') {
    const consults = await inspectDoctorData(id);
    return (
      <div className="card">
        <div className="card__title">Konsultasi dokter ini</div>
        {consults.length === 0 ? <Empty title="Belum ada konsultasi" hint="" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {consults.map((c) => (
              <div key={c.id} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{c.counterpart}</strong>
                  <span className="pill pill--mute">{c.status}</span>
                </div>
                {c.shared.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {c.shared.map((s, i) => (
                      <span key={i} className={`pill ${s.triage ? triageCls[s.triage] : 'pill--mute'}`}>{s.type}: {s.display}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // customer
  const { readings, consults } = await inspectCustomerData(id);
  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card__title">Hasil pemeriksaan (tampak customer)</div>
        {readings.length === 0 ? <Empty title="Belum ada hasil" hint="" /> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Jenis</th><th>Nilai</th><th>Tanggal</th><th>Triase</th></tr></thead>
              <tbody>
                {readings.map((r, i) => (
                  <tr key={i}>
                    <td>{r.type}</td><td className="mono">{r.display}</td>
                    <td className="mono" style={{ color: 'var(--muted)' }}>{fmt(r.takenAt)}</td>
                    <td><span className={`pill ${r.triage ? triageCls[r.triage] : 'pill--mute'}`}>{r.triage ?? '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="card">
        <div className="card__title">Konsultasi (tampak customer)</div>
        {consults.length === 0 ? <Empty title="Belum ada konsultasi" hint="" /> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Dokter</th><th>Status</th><th>Tarif</th></tr></thead>
              <tbody>
                {consults.map((c) => (
                  <tr key={c.id}><td>{c.counterpart}</td><td><span className="pill pill--mute">{c.status}</span></td><td className="mono">{rupiah(c.fee)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
