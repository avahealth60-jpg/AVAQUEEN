'use client';
import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { withdrawConsent } from '../app/actions';

export function AppBar({ hasConsent }: { hasConsent: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  async function signOut() { await createClient().auth.signOut(); router.refresh(); }
  function revoke() { start(async () => { await withdrawConsent(); router.refresh(); }); }
  return (
    <header className="appbar">
      <div className="appbar__mark">A</div>
      <span className="appbar__name">AVA</span>
      <div className="appbar__spacer" />
      {hasConsent && <button className="appbar__link" onClick={revoke} disabled={pending}>Tarik consent</button>}
      <button className="appbar__link" onClick={signOut} style={{ marginLeft: 12 }}>Keluar</button>
    </header>
  );
}
