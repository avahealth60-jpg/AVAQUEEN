// apps/admin/app/layout.tsx — shell + gerbang auth.
// Aturan:
//  - Auth belum dikonfigurasi (dev) → tampilkan konsol langsung (halaman
//    menampilkan banner "belum tersambung"). Tak ada data untuk dijaga.
//  - Dikonfigurasi & belum login → form masuk.
//  - Login tapi peran ≠ ava_admin → akses ditolak.
//  - ava_admin → konsol penuh.
import './globals.css';
import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { LoginForm } from '../components/LoginForm';
import { SignOutButton } from '../components/SignOutButton';
import { NotAuthorized } from '../components/widgets';
import { getAuth } from '../lib/auth';
import { stats, isConfigured } from '../lib/data';

export const metadata = { title: 'AVA Admin · Konsol QC' };

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="auth-screen">{children}</div>;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuth();

  let body: React.ReactNode;
  if (auth.configured && !auth.email) {
    body = <Centered><LoginForm /></Centered>;
  } else if (auth.configured && auth.role !== 'ava_admin') {
    body = (
      <Centered>
        <NotAuthorized email={auth.email} signOut={<SignOutButton email={auth.email} />} />
      </Centered>
    );
  } else {
    let alertCount = 0;
    if (isConfigured()) {
      const s = await stats();
      alertCount = s.overdueCalibrations + s.dueSoonCalibrations;
    }
    body = (
      <div className="shell">
        <Sidebar alertCount={alertCount} email={auth.email} />
        <main className="main">{children}</main>
      </div>
    );
  }

  return (<html lang="id"><body>{body}</body></html>);
}
