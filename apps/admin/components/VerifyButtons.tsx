'use client';
// apps/admin/components/VerifyButtons.tsx — aksi verifikasi dokter.
import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { verifyDoctor } from '../app/actions';

export function VerifyButtons({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  function act(next: string) {
    start(async () => {
      const r = await verifyDoctor(id, next);
      setNote(r.ok ? null : r.message);
      if (r.ok) router.refresh();
    });
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {status !== 'verified' && (
        <button className="btn" style={{ padding: '5px 10px', fontSize: 13 }} disabled={pending} onClick={() => act('verified')}>Verifikasi</button>
      )}
      {status !== 'rejected' && (
        <button className="btn btn--ghost" style={{ padding: '5px 10px', fontSize: 13 }} disabled={pending} onClick={() => act('rejected')}>Tolak</button>
      )}
      {status !== 'pending' && (
        <button className="btn btn--ghost" style={{ padding: '5px 10px', fontSize: 13 }} disabled={pending} onClick={() => act('pending')}>Reset</button>
      )}
      {note && <span style={{ color: 'var(--bad)', fontSize: 12 }}>{note}</span>}
    </div>
  );
}
