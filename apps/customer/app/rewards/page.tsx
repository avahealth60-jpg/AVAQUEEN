// apps/customer/app/rewards/page.tsx — lencana & pencapaian.
import React from 'react';
import Link from 'next/link';
import { evaluateAchievements } from '@ava/domain';
import { getCustomerAuth } from '../../lib/auth';
import { achievementStats } from '../../lib/data';
import { ConnBanner } from '../../components/ConnBanner';

export const dynamic = 'force-dynamic';

export default async function RewardsPage() {
  const { configured } = await getCustomerAuth();
  if (!configured) return <div className="screen"><ConnBanner /></div>;

  const stats = await achievementStats();
  const items = evaluateAchievements(stats);
  const earned = items.filter((a) => a.earned).length;

  return (
    <div className="screen">
      <header style={{ marginBottom: 'var(--ava-space-5)' }}>
        <p style={{
          fontFamily: 'var(--ava-font-mono)', fontSize: 'var(--ava-text-xs)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--ava-color-trust-600)', margin: 0,
        }}>
          Rewards
        </p>
        <h1 style={{
          fontFamily: 'var(--ava-font-display)', fontSize: 'var(--ava-text-2xl)',
          fontWeight: 600, color: 'var(--ava-color-ink-900)', margin: '4px 0 0',
        }}>
          Lencana &amp; pencapaian
        </h1>
        <p style={{ color: 'var(--ava-color-ink-500)', margin: '4px 0 0' }}>
          {earned} dari {items.length} lencana diraih. Terus jaga kebiasaan sehatmu!
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {items.map((a) => {
          const pct = a.target ? Math.min(100, Math.round((a.current / a.target) * 100)) : (a.earned ? 100 : 0);
          return (
            <div key={a.id} className="card" style={{ marginBottom: 0, opacity: a.earned ? 1 : 0.65 }}>
              <div style={{ fontSize: 28, filter: a.earned ? 'none' : 'grayscale(1)' }}>{a.icon}</div>
              <div style={{ fontWeight: 600, color: 'var(--ava-color-ink-900)', marginTop: 4 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: 'var(--ava-color-ink-500)' }}>{a.desc}</div>
              {a.earned ? (
                <span className="pill pill--normal" style={{ marginTop: 8 }}>Diraih ✓</span>
              ) : a.target ? (
                <>
                  <div style={{ height: 6, background: 'var(--ava-color-line)', borderRadius: 999, overflow: 'hidden', marginTop: 8 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--ava-color-trust-600)' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ava-color-ink-500)', marginTop: 4 }}>{a.current}/{a.target}</div>
                </>
              ) : (
                <span className="pill pill--none" style={{ marginTop: 8 }}>Belum</span>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ marginTop: 16 }}>
        <Link className="btn btn--ghost" href="/" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
          Kembali ke beranda
        </Link>
      </p>
    </div>
  );
}
