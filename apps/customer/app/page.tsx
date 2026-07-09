// apps/customer/app/page.tsx — Beranda premium: hero, wellness score, metrik, aksi, insight.
import React from 'react';
import Link from 'next/link';
import { getCustomerAuth } from '../lib/auth';
import { hasActiveConsent, homeData, unreadCount, myProfile, liveWellnessNudges } from '../lib/data';
import { ConsentCard } from '../components/ConsentCard';
import { PanelForm } from '../components/PanelForm';
import { History } from '../components/History';
import { ConnBanner } from '../components/ConnBanner';
import { OnboardingHint } from '../components/OnboardingHint';
import { HomeHero } from '../components/home/HomeHero';
import { WellnessScoreRing } from '../components/home/WellnessScoreRing';
import { HomeMetrics } from '../components/home/HomeMetrics';
import { QuickActions } from '../components/home/QuickActions';
import { InsightCard } from '../components/home/InsightCard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const auth = await getCustomerAuth();
  if (!auth.configured) return <div className="screen"><ConnBanner /></div>;

  const consent = await hasActiveConsent();
  if (!consent) {
    return <div className="screen"><ConsentCard /></div>;
  }

  const [home, unread, profile, nudges] = await Promise.all([
    homeData(), unreadCount(), myProfile(), liveWellnessNudges(),
  ]);
  const tip = nudges[0];

  return (
    <div className="screen">
      <HomeHero name={profile.fullName} email={auth.email} unread={unread} scoreLabel={home.score.label} />

      <OnboardingHint />

      <WellnessScoreRing score={home.score.score} label={home.score.label} />

      <HomeMetrics metrics={home.metrics} />

      <div className="section-h" style={{ marginTop: 20 }}>Aksi cepat</div>
      <QuickActions />

      <InsightCard
        title={tip ? tip.title : 'Jaga kebiasaan sehatmu'}
        body={tip ? tip.body : 'Catat pemeriksaan & aktivitas harianmu agar AVA bisa memberi insight yang lebih personal.'}
      />

      {/* Progress pemeriksaan */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ color: 'var(--ink)' }}>Progress Pemeriksaan</strong>
          <strong style={{ color: 'var(--brand)' }}>{home.progress.pct}%</strong>
        </div>
        <div style={{ height: 8, background: 'var(--line)', borderRadius: 999, overflow: 'hidden', margin: '10px 0 8px' }}>
          <div style={{ width: `${home.progress.pct}%`, height: '100%', background: 'linear-gradient(90deg,#0F8B73,#22D3A6)', borderRadius: 999 }} />
        </div>
        <div className="hint">{home.progress.done} dari {home.progress.total} pemeriksaan tercatat</div>
      </div>

      <div className="section-h">Catat pemeriksaan</div>
      <PanelForm />

      <Link href="/rewards" className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, textDecoration: 'none', marginTop: 'var(--ava-space-3)' }}>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>Lencana &amp; rewards</div>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>🔥 Streak {home.streak} hari · kumpulkan pencapaian</div>
        </div>
        <span aria-hidden style={{ fontSize: 22, color: 'var(--brand)' }}>→</span>
      </Link>

      <History />
    </div>
  );
}
