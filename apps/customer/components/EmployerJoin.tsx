'use client';
// apps/customer/components/EmployerJoin.tsx — gabung program wellness pemberi kerja.
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { joinEmployer, leaveEmployer } from '../app/actions';
import type { EmployerMembershipView } from '../lib/data';

export function EmployerJoin({ memberships }: { memberships: EmployerMembershipView[] }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);

  async function run(fn: () => Promise<{ ok: boolean; message: string }>) {
    setBusy(true); setNote(null);
    const r = await fn();
    setNote({ kind: r.ok ? 'ok' : 'bad', text: r.message });
    if (r.ok) router.refresh();
    setBusy(false);
  }

  return (
    <>
      <div className="card">
        <p style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--ava-color-ink-500)' }}>
          Punya kode dari kantor? Gabung program wellness pemberi kerja. Yang
          dibagikan ke mereka hanya <strong>statistik anonim</strong> (mis.
          tingkat partisipasi) — <strong>bukan</strong> data kesehatanmu.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" placeholder="Kode pemberi kerja" value={code}
            onChange={(e) => setCode(e.target.value)} style={{ flex: 1 }} />
          <button className="btn" disabled={busy || !code}
            onClick={async () => { await run(() => joinEmployer(code)); setCode(''); }}>
            Gabung
          </button>
        </div>
        {note && <div className={`note note--${note.kind}`}>{note.text}</div>}
      </div>

      {memberships.length > 0 && (
        <>
          <div className="section-h">Pemberi kerja kamu</div>
          <div className="card">
            {memberships.map((m) => (
              <div className="read" key={m.employerId}>
                <div className="read__main">
                  <div className="read__label">{m.employerName ?? 'Pemberi kerja'}</div>
                  <div className="read__meta">Bergabung {new Date(m.joinedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
                <button className="btn btn--ghost" disabled={busy} onClick={() => run(() => leaveEmployer(m.employerId))}>
                  Keluar
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
