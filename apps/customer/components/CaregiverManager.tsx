'use client';
// apps/customer/components/CaregiverManager.tsx — kelola berbagi ke pendamping.
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CAREGIVER_SCOPES, DEFAULT_CAREGIVER_SCOPES } from '@ava/domain';
import {
  inviteCaregiver, revokeCaregiver, claimCaregiverInvite, leaveCaregiver,
} from '../app/actions';
import type { CaregiverLinkView } from '../lib/data';

const SCOPE_LABEL: Record<string, string> = {
  readings: 'Hasil pemeriksaan',
  wellness: 'Program wellness',
  consultations: 'Konsultasi',
};

type Note = { kind: 'ok' | 'bad'; text: string } | null;

export function CaregiverManager({
  asPatient,
  asCaregiver,
}: {
  asPatient: CaregiverLinkView[];
  asCaregiver: CaregiverLinkView[];
}) {
  const router = useRouter();
  const [scopes, setScopes] = useState<string[]>([...DEFAULT_CAREGIVER_SCOPES]);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [claimTok, setClaimTok] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);

  function toggle(s: string) {
    setScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  async function run(fn: () => Promise<{ ok: boolean; message: string; token?: string }>) {
    setBusy(true); setNote(null);
    const r = await fn();
    setNote({ kind: r.ok ? 'ok' : 'bad', text: r.message });
    if (r.ok) router.refresh();
    setBusy(false);
    return r;
  }

  return (
    <>
      {/* ── Pendamping kamu (aku = pasien) ── */}
      <div className="section-h">Pendamping kamu</div>
      <div className="card">
        <p style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--ava-color-ink-500)' }}>
          Undang keluarga untuk memantau kesehatanmu. Pilih apa yang dibagikan —
          mereka hanya bisa <strong>melihat</strong>, dan kamu bisa cabut kapan saja.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
          {CAREGIVER_SCOPES.map((s) => (
            <label key={s} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
              <input type="checkbox" checked={scopes.includes(s)} onChange={() => toggle(s)} />
              {SCOPE_LABEL[s] ?? s}
            </label>
          ))}
        </div>
        <button className="btn" disabled={busy || scopes.length === 0}
          onClick={async () => { const r = await run(() => inviteCaregiver(scopes)); if (r.ok && r.token) setNewToken(r.token); }}>
          {busy ? 'Memproses…' : 'Buat undangan'}
        </button>

        {newToken && (
          <div className="note note--ok" style={{ wordBreak: 'break-all' }}>
            Kode undangan: <strong>{newToken}</strong><br />
            Bagikan kode ini ke pendampingmu. Mereka memasukkannya di bagian
            "Kamu mendampingi".
          </div>
        )}

        {asPatient.length > 0 && (
          <div style={{ marginTop: 14 }}>
            {asPatient.filter((l) => l.status !== 'revoked').map((l) => (
              <div className="read" key={l.id}>
                <div className="read__main">
                  <div className="read__label">
                    {l.status === 'pending' ? 'Menunggu diterima' : 'Pendamping aktif'}
                  </div>
                  <div className="read__meta">
                    {l.scopes.map((s) => SCOPE_LABEL[s] ?? s).join(', ')}
                    {l.status === 'pending' && ` · kode: ${l.inviteToken}`}
                  </div>
                </div>
                <button className="btn btn--ghost" disabled={busy}
                  onClick={() => run(() => revokeCaregiver(l.id))}>
                  Cabut
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Kamu mendampingi (aku = pendamping) ── */}
      <div className="section-h">Kamu mendampingi</div>
      <div className="card">
        <p style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--ava-color-ink-500)' }}>
          Punya kode undangan dari keluarga? Masukkan di sini untuk mulai memantau.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" placeholder="Kode undangan" value={claimTok}
            onChange={(e) => setClaimTok(e.target.value)} style={{ flex: 1 }} />
          <button className="btn" disabled={busy || !claimTok}
            onClick={async () => { await run(() => claimCaregiverInvite(claimTok)); setClaimTok(''); }}>
            Tukar
          </button>
        </div>

        {asCaregiver.length > 0 && (
          <div style={{ marginTop: 14 }}>
            {asCaregiver.map((l) => (
              <div className="read" key={l.id}>
                <div className="read__main">
                  <div className="read__label">Pasien yang kamu dampingi</div>
                  <div className="read__meta">{l.scopes.map((s) => SCOPE_LABEL[s] ?? s).join(', ')}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {l.scopes.includes('readings') && (
                    <Link className="btn btn--ghost" href={`/pendamping/pasien/${l.patientId}`}
                      style={{ textDecoration: 'none' }}>
                      Lihat hasil
                    </Link>
                  )}
                  <button className="btn btn--ghost" disabled={busy} onClick={() => run(() => leaveCaregiver(l.id))}>
                    Berhenti
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {note && <div className={`note note--${note.kind}`}>{note.text}</div>}
    </>
  );
}
