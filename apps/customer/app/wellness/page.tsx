// apps/customer/app/wellness/page.tsx — program & kebiasaan sehat.
import React from 'react';
import Link from 'next/link';
import { getCustomerAuth } from '../../lib/auth';
import { wellnessDashboard, myProfile, homeData } from '../../lib/data';
import { ConnBanner } from '../../components/ConnBanner';
import { WellnessCard } from '../../components/WellnessCard';
import { WellnessCalculators } from '../../components/WellnessCalculators';

export const dynamic = 'force-dynamic';

export default async function WellnessPage() {
  const { configured } = await getCustomerAuth();
  if (!configured) return <div className="screen"><ConnBanner /></div>;

  const [cards, profile, home] = await Promise.all([wellnessDashboard(), myProfile(), homeData()]);
  const active = cards.filter((c) => c.enrolled);
  const available = cards.filter((c) => !c.enrolled);
  const steps = home.metrics.find((m) => m.key === 'steps');
  const sleep = home.metrics.find((m) => m.key === 'sleep_minutes');

  return (
    <div className="screen">
      <header className="phead">
        <p className="phead__kicker">Wellness</p>
        <h1 className="phead__title">Program & kebiasaan sehat</h1>
        <p className="phead__sub">Target harian yang ramah & realistis — terhubung dengan langkah, tidur, dan aktivitasmu.</p>
      </header>

      {/* Ringkasan aktivitas hari ini */}
      <div className="wsum">
        <div className="wsum__c" style={{ color: '#F5A524' }}>
          <div className="wsum__ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 3l-2 6h5l-6 12 2-8H7l6-10z" /></svg></div>
          <div className="wsum__val">{steps?.value ?? '—'}</div>
          <div className="wsum__label">Langkah</div>
        </div>
        <div className="wsum__c" style={{ color: '#6D6AFB' }}>
          <div className="wsum__ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg></div>
          <div className="wsum__val">{sleep?.value ?? '—'}</div>
          <div className="wsum__label">Tidur</div>
        </div>
        <div className="wsum__c" style={{ color: '#14B89A' }}>
          <div className="wsum__ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></div>
          <div className="wsum__val">{active.length}</div>
          <div className="wsum__label">Program aktif</div>
        </div>
      </div>

      <WellnessCalculators initial={{
        beratKg: profile.weightKg, tinggiCm: profile.heightCm,
        usia: profile.ageYears, sex: profile.sex,
      }} />

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
