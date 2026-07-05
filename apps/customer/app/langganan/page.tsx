// apps/customer/app/langganan/page.tsx — pilih & kelola langganan.
import React from 'react';
import Link from 'next/link';
import { getCustomerAuth } from '../../lib/auth';
import { billingSummary } from '../../lib/data';
import { ConnBanner } from '../../components/ConnBanner';
import { SubscriptionManager } from '../../components/SubscriptionManager';

export const dynamic = 'force-dynamic';

export default async function LanggananPage() {
  const { configured } = await getCustomerAuth();
  if (!configured) return <div className="screen"><ConnBanner /></div>;

  const billing = await billingSummary();

  return (
    <div className="screen">
      <header style={{ marginBottom: 'var(--ava-space-5)' }}>
        <p style={{
          fontFamily: 'var(--ava-font-mono)', fontSize: 'var(--ava-text-xs)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--ava-color-trust-600)', margin: 0,
        }}>
          Langganan
        </p>
        <h1 style={{
          fontFamily: 'var(--ava-font-display)', fontSize: 'var(--ava-text-2xl)',
          fontWeight: 600, color: 'var(--ava-color-ink-900)', margin: '4px 0 0',
        }}>
          Pilih paketmu
        </h1>
        <p style={{ color: 'var(--ava-color-ink-500)', margin: '4px 0 0' }}>
          Premium membuka diskon konsultasi, wellness lanjutan, dan berbagi keluarga lebih luas.
        </p>
      </header>

      <SubscriptionManager effective={billing.effective} subscription={billing.subscription} />

      <p style={{ marginTop: 16 }}>
        <Link className="btn btn--ghost" href="/" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
          Kembali ke beranda
        </Link>
      </p>
    </div>
  );
}
