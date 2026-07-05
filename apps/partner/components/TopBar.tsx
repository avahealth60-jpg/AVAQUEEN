'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { ThemeToggle } from './ThemeToggle';

const ROLE_LABEL: Record<string, string> = {
  vendor: 'Vendor', lab: 'Lab kalibrasi', faskes_admin: 'Faskes', doctor: 'Dokter', employer: 'Pemberi kerja',
};

export function TopBar({ role, orgName, email }: { role: string | null; orgName: string | null; email: string | null }) {
  const router = useRouter();
  async function signOut() { await createClient().auth.signOut(); router.refresh(); }
  return (
    <header className="topbar">
      <div className="topbar__in">
        <div className="topbar__mark">A</div>
        <span className="topbar__name">AVA Partner</span>
        {role && <span className="topbar__role">{ROLE_LABEL[role] ?? role}</span>}
        {orgName && <span className="topbar__user" style={{ marginLeft: 8 }}>· {orgName}</span>}
        <div className="topbar__spacer" />
        {email && <span className="topbar__user">{email}</span>}
        <ThemeToggle />
        <button className="topbar__signout" onClick={signOut}>Keluar</button>
      </div>
    </header>
  );
}
