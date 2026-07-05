import '@ava/ui/src/tokens.css';
import '@ava/ui/src/theme.css';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--ava-font-body' });
const display = Space_Grotesk({ subsets: ['latin'], variable: '--ava-font-display' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--ava-font-mono' });

const NO_FLASH = `(function(){try{var t=localStorage.getItem('ava-theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;
const ThemeHead = () => <head><script dangerouslySetInnerHTML={{ __html: NO_FLASH }} /></head>;

// apps/partner/app/layout.tsx — shell + gerbang auth peran mitra.
import './globals.css';
import React from 'react';
import { TopBar } from '../components/TopBar';
import { LoginForm } from '../components/LoginForm';
import { getPartnerAuth, isPartnerRole } from '../lib/auth';

export const metadata = { title: 'AVA Partner · Portal Mitra' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const auth = await getPartnerAuth();

  if (auth.configured && !auth.email) {
    return (
      <html lang="id" className={`${inter.variable} ${display.variable} ${mono.variable}`}>
        <ThemeHead />
        <body><div className="auth-screen"><LoginForm /></div></body>
      </html>
    );
  }

  if (auth.configured && !isPartnerRole(auth.role)) {
    return (
      <html lang="id" className={`${inter.variable} ${display.variable} ${mono.variable}`}>
        <ThemeHead />
        <body><div className="auth-screen">
          <div className="login">
            <div className="login__mark" style={{ background: 'var(--bad)' }}>!</div>
            <h1 className="login__title">Akses ditolak</h1>
            <p className="login__sub">Akun {auth.email ? <strong>{auth.email}</strong> : 'ini'} bukan mitra
              (vendor/lab/faskes). Portal ini hanya untuk mitra AVA.</p>
          </div>
        </div></body>
      </html>
    );
  }

  return (
    <html lang="id" className={`${inter.variable} ${display.variable} ${mono.variable}`}>
      <ThemeHead />
      <body>
        {auth.configured && <TopBar role={auth.role} orgName={auth.org?.name ?? null} email={auth.email} />}
        {children}
      </body>
    </html>
  );
}