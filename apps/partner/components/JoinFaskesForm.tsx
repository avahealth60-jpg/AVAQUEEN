'use client';
// apps/partner/components/JoinFaskesForm.tsx — dokter bergabung ke faskes via kode.
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { joinFaskes } from '../app/actions';

export function JoinFaskesForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);

  async function submit() {
    if (!code.trim()) return;
    setBusy(true); setNote(null);
    const r = await joinFaskes(code);
    setNote({ kind: r.ok ? 'ok' : 'bad', text: r.message });
    if (r.ok) { setCode(''); router.refresh(); }
    setBusy(false);
  }

  return (
    <div className="card">
      <div className="card__title">Gabung faskes</div>
      <p className="hint" style={{ marginBottom: 8 }}>Punya kode dari klinik/faskes tempatmu praktik? Masukkan di sini.</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input" placeholder="Kode faskes" value={code} onChange={(e) => setCode(e.target.value)} style={{ flex: 1 }} />
        <button className="btn" disabled={busy || !code.trim()} onClick={submit}>Gabung</button>
      </div>
      {note && <div className={`note ${note.kind === 'ok' ? 'note--ok' : 'note--bad'}`}>{note.text}</div>}
    </div>
  );
}
