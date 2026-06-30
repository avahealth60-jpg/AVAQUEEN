// apps/customer/app/page.tsx — beranda: consent-gate → input → riwayat. (V1.1.1 header)
import React from 'react';
import { getCustomerAuth } from '../lib/auth';
import { hasActiveConsent } from '../lib/data';
import { ConsentCard } from '../components/ConsentCard';
import { ReadingForm } from '../components/ReadingForm';
import { History } from '../components/History';
import { ConnBanner } from '../components/ConnBanner';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { configured } = await getCustomerAuth();
  if (!configured) return <div className="screen"><ConnBanner /></div>;

  const consent = await hasActiveConsent();
  return (
    <div className="screen">
      <header style={{ marginBottom: 'var(--ava-space-5)' }}>
        <p
          style={{
            fontFamily: 'var(--ava-font-mono)', fontSize: 'var(--ava-text-xs)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--ava-color-trust-600)', margin: 0,
          }}
        >
          Pendamping harian
        </p>
        <h1
          style={{
            fontFamily: 'var(--ava-font-display)', fontSize: 'var(--ava-text-2xl)',
            fontWeight: 600, color: 'var(--ava-color-ink-900)', margin: '4px 0 0',
          }}
        >
          Halo
        </h1>
        <p style={{ color: 'var(--ava-color-ink-500)', margin: '4px 0 0' }}>
          Catat hasil pemeriksaanmu dan dapatkan penjelasan edukatif.
        </p>
      </header>

      {!consent ? (
        <ConsentCard />
      ) : (
        <>
          <div className="card">
            <ReadingForm />
          </div>
          <History />
        </>
      )}
    </div>
  );
}
