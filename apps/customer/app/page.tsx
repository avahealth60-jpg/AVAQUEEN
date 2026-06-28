// apps/customer/app/page.tsx — beranda: consent-gate → input → riwayat.
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
      <h1 className="hello">Halo 👋</h1>
      <p>Catat hasil pemeriksaanmu dan dapatkan penjelasan edukatif.</p>

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
