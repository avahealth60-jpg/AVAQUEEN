'use client';
// apps/partner/components/DoctorCredentials.tsx — kirim STR/SIP + status verifikasi.
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveDoctorCredentials } from '../app/actions';

const STATUS: Record<string, [string, string]> = {
  pending: ['pill pill--warn', 'Menunggu verifikasi'],
  verified: ['pill pill--ok', 'Terverifikasi'],
  rejected: ['pill pill--bad', 'Ditolak — perbaiki data'],
};

export function DoctorCredentials({ strNo, sipNo, status }: { strNo: string | null; sipNo: string | null; status: string }) {
  const router = useRouter();
  const [str, setStr] = useState(strNo ?? '');
  const [sip, setSip] = useState(sipNo ?? '');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);
  const [cls, label] = STATUS[status] ?? ['pill pill--mute', status];

  async function save() {
    setBusy(true); setNote(null);
    const r = await saveDoctorCredentials(str, sip);
    setNote({ kind: r.ok ? 'ok' : 'bad', text: r.message });
    if (r.ok) router.refresh();
    setBusy(false);
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="card__title" style={{ marginBottom: 0 }}>Kredensial praktik (STR/SIP)</div>
        <span className={cls}>{label}</span>
      </div>
      {status !== 'verified' && (
        <p className="hint" style={{ margin: '8px 0' }}>
          Isi nomor STR &amp; SIP. Pasien hanya bisa membooking dokter yang sudah diverifikasi admin.
        </p>
      )}
      <div className="grid2" style={{ marginTop: 8 }}>
        <div className="field"><label>No. STR</label><input className="input" value={str} onChange={(e) => setStr(e.target.value)} placeholder="mis. 12345/STR/2026" /></div>
        <div className="field"><label>No. SIP</label><input className="input" value={sip} onChange={(e) => setSip(e.target.value)} placeholder="mis. 503/SIP/2026" /></div>
      </div>
      <button className="btn btn--ghost" disabled={busy} onClick={save}>{busy ? 'Menyimpan…' : 'Simpan kredensial'}</button>
      {note && <div className={`note ${note.kind === 'ok' ? 'note--ok' : 'note--bad'}`}>{note.text}</div>}
    </div>
  );
}
