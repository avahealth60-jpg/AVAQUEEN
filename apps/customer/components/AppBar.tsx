'use client';
import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { ThemeToggle } from './ThemeToggle';

// Consent & keluar kini di halaman /akun; AppBar fokus: brand + tema + keluar cepat.
export function AppBar({ hasConsent: _hasConsent }: { hasConsent: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function signOut() { start(async () => { await createClient().auth.signOut(); router.refresh(); }); }
  return (
    <header className="appbar">
      <div className="appbar__mark">A</div>
      <span className="appbar__name">AVA</span>
      <div className="appbar__spacer" />
      <ThemeToggle />
      <button className="appbar__link" onClick={signOut} disabled={pending} style={{ marginLeft: 12 }}>Keluar</button>
    </header>
  );
}
