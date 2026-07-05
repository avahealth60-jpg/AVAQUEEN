// apps/customer/app/wellness/page.tsx — program & kebiasaan sehat.
import React from 'react';
import Link from 'next/link';
import { getCustomerAuth } from '../../lib/auth';
import { wellnessDashboard } from '../../lib/data';
import { ConnBanner } from '../../components/ConnBanner';
import { WellnessCard } from '../../components/WellnessCard';

export const dynamic = 'force-dynamic';

export default async function WellnessPage() {
  const { configured } = await getCustomerAuth();
  if (!configured) return <div className="screen"><ConnBanner /></div>;

  const cards = await wellnessDashboard();
  const active = cards.filter((c) => c.enrolled);
  const available = cards.filter((c) => !c.enrolled);

  return (
    <div className="screen">
      <header style={{ marginBottom: 'var(--ava-space-5)' }}>
        <p style={{
          fontFamily: 'var(--ava-font-mono)', fontSize: 'var(--ava-text-xs)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--ava-color-trust-600)', margin: 0,
        }}>
          Wellness
        </p>
        <h1 style={{
          fontFamily: 'var(--ava-font-display)', fontSize: 'var(--ava-text-2xl)',
          fontWeight: 600, color: 'var(--ava-color-ink-900)', margin: '4px 0 0',
        }}>
          Program & kebiasaan sehat
        </h1>
        <p style={{ color: 'var(--ava-color-ink-500)', margin: '4px 0 0' }}>
          Target harian yang ramah & realistis — terhubung dengan langkah, tidur, dan aktivitasmu.
        </p>
      </header>

      {active.length > 0 && (
        <>
          <div className="section-h">Program aktif</div>
          {active.map((c) => <WellnessCard key={c.program.code} card={c} />)}
        </>
      )}

      <div className="section-h">{active.length > 0 ? 'Jelajahi lainnya' : 'Mulai program'}</div>
      {available.map((c) => <WellnessCard key={c.program.code} card={c} />)}

      <p style={{ marginTop: 16, fontSize: 12, color: 'var(--ava-color-ink-500)' }}>
        Program wellness bersifat edukatif untuk membangun kebiasaan, bukan
        anjuran medis. Untuk kondisi tertentu, konsultasikan dengan tenaga kesehatan.
      </p>

      <p style={{ marginTop: 8 }}>
        <Link className="btn btn--ghost" href="/" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
          Kembali ke beranda
        </Link>
      </p>
    </div>
  );
}
