// apps/customer/app/layout.tsx — shell PWA mobile-first + gerbang auth.
import './globals.css';
import React from 'react';
import { getCustomerAuth } from '../lib/auth';
import { hasActiveConsent } from '../lib/data';
import { LoginForm } from '../components/LoginForm';
import { AppBar } from '../components/AppBar';
import { BottomNav } from '../components/BottomNav';

export const metadata = {
  title: 'AVA — Pendamping Kesehatan',
  manifest: '/manifest.webmanifest',
};
export const viewport = {
  themeColor: '#0E7C66',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const auth = await getCustomerAuth();

  if (auth.configured && !auth.userId) {
    return (<html lang="id"><body><LoginForm /></body></html>);
  }
  const consent = auth.configured ? await hasActiveConsent() : false;
  return (
    <html lang="id">
      <body>
        <div className="app">
          {auth.configured && <AppBar hasConsent={consent} />}
          {children}
          {auth.configured && <BottomNav />}
        </div>
      </body>
    </html>
  );
}
