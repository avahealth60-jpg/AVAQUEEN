'use client';
import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setJoinCode } from '../app/actions';

export function JoinCodeForm({ current }: { current: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [code, setCode] = useState('');
  const [display, setDisplay] = useState<string | null>(current);
  const [note, setNote] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);

  function submit(custom: string) {
    start(async () => {
      const fd = new FormData();
      fd.set('code', custom); // kosong → fungsi mengacak
      const r = await setJoinCode(null, fd);
      setNote({ kind: r.ok ? 'ok' : 'bad', text: r.message });
      if (r.ok) { setDisplay(r.code ?? display); setCode(''); router.refresh(); }
    });
  }

  return (
    <div>
      {display
        ? <div className="mono" style={{ fontSize: 20, letterSpacing: '0.05em' }}>{display}</div>
        : <div className="hint">Belum ada kode. Buat di bawah.</div>}

      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <input className="input" placeholder="Kode kustom (A–Z, 0–9)" value={code}
          onChange={(e) => setCode(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
        <button className="btn" disabled={pending || !code} onClick={() => submit(code)}>
          {pending ? 'Menyimpan…' : 'Simpan'}
        </button>
        <button className="btn btn--ghost" disabled={pending} onClick={() => submit('')} title="Acak kode baru">
          Acak
        </button>
      </div>
      {note && <div className={`note ${note.kind === 'ok' ? 'note--ok' : 'note--bad'}`}>{note.text}</div>}
    </div>
  );
}
