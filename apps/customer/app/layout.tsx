import '@ava/ui/src/tokens.css';
import '@ava/ui/src/theme.css';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import React from 'react';

// Set tema sebelum paint (hindari kedip). Tanpa pilihan → ikut sistem.
const NO_FLASH = `(function(){try{var t=localStorage.getItem('ava-theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;
import { getCustomerAuth } from '../lib/auth';
import { hasActiveConsent } from '../lib/data';
import { LoginForm } from '../components/LoginForm';
import { AppBar } from '../components/AppBar';
import { BottomNav } from '../components/BottomNav';
import { FloatingAssistant } from '../components/FloatingAssistant';

const inter = Inter({ subsets: ['latin'], variable: '--ava-font-body' });
const display = Space_Grotesk({ subsets: ['latin'], variable: '--ava-font-display' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--ava-font-mono' });

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
    return (
      <html lang="id" className={`${inter.variable} ${display.variable} ${mono.variable}`}>
        <head><script dangerouslySetInnerHTML={{ __html: NO_FLASH }} /></head>
        <body><LoginForm /></body>
      </html>
    );
  }

  const consent = auth.configured ? await hasActiveConsent() : false;
  return (
    <html lang="id" className={`${inter.variable} ${display.variable} ${mono.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: NO_FLASH }} /></head>
      <body>
        <div className="app">
          {auth.configured && <AppBar hasConsent={consent} />}
          {children}
          {auth.configured && consent && <FloatingAssistant />}
          {auth.configured && <BottomNav />}
        </div>
      </body>
    </html>
  );
}