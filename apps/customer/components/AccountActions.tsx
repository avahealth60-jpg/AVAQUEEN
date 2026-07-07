'use client';
// apps/customer/components/AccountActions.tsx — aksi akun (consent + keluar).
import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { grantConsent, withdrawConsent } from '../app/actions';

export function ConsentToggle({ active }: { active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  function toggle() {
    start(async () => {
      const r = active ? await withdrawConsent() : await grantConsent();
      setNote(r.message);
      if (r.ok) router.refresh();
    });
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--ava-color-ink-900)' }}>Pemrosesan data kesehatan</div>
          <div style={{ fontSize: 13, color: 'var(--ava-color-ink-500)' }}>
            {active ? 'Aktif — kamu bisa mencatat & menganalisis hasil.' : 'Nonaktif — berikan izin untuk mulai mencatat.'}
          </div>
        </div>
        <span className={`pill ${active ? 'pill--normal' : 'pill--none'}`}>{active ? 'Aktif' : 'Nonaktif'}</span>
      </div>
      <button className="btn btn--ghost" style={{ marginTop: 12 }} onClick={toggle} disabled={pending}>
        {pending ? 'Memproses…' : active ? 'Tarik persetujuan' : 'Berikan persetujuan'}
      </button>
      {note && <div className="note note--ok">{note}</div>}
    </div>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  function out() { start(async () => { await createClient().auth.signOut(); router.refresh(); }); }
  return (
    <button className="btn btn--ghost" onClick={out} disabled={pending}>
      {pending ? 'Keluar…' : 'Keluar dari akun'}
    </button>
  );
}

/** Keamanan sesi: keluar dari SEMUA perangkat (invalidasi semua sesi). */
export function SignOutAllButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  function outAll() {
    start(async () => {
      const { error } = await createClient().auth.signOut({ scope: 'global' });
      if (error) { setNote(error.message); return; }
      router.refresh();
    });
  }
  return (
    <div className="card">
      <div style={{ fontWeight: 600, color: 'var(--ava-color-ink-900)' }}>Keamanan sesi</div>
      <p style={{ fontSize: 13, color: 'var(--ava-color-ink-500)', margin: '4px 0 12px' }}>
        Keluar dari semua perangkat yang pernah masuk ke akunmu — berguna bila
        kehilangan perangkat atau ingin memutus semua sesi.
      </p>
      <button className="btn btn--ghost" onClick={outAll} disabled={pending}>
        {pending ? 'Memproses…' : 'Keluar dari semua perangkat'}
      </button>
      {note && <div className="note note--bad">{note}</div>}
    </div>
  );
}
