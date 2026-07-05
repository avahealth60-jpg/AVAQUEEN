// apps/customer/app/riwayat/page.tsx — riwayat & tren lengkap.
import React from 'react';
import Link from 'next/link';
import { getCustomerAuth } from '../../lib/auth';
import { readings, trends } from '../../lib/data';
import { ConnBanner } from '../../components/ConnBanner';
import { RiwayatList } from '../../components/RiwayatList';

export const dynamic = 'force-dynamic';

export default async function RiwayatPage() {
  const { configured } = await getCustomerAuth();
  if (!configured) return <div className="screen"><ConnBanner /></div>;

  const [rows, tr] = await Promise.all([readings(), trends()]);

  return (
    <div className="screen">
      <header style={{ marginBottom: 'var(--ava-space-5)' }}>
        <p style={{
          fontFamily: 'var(--ava-font-mono)', fontSize: 'var(--ava-text-xs)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--ava-color-trust-600)', margin: 0,
        }}>
          Riwayat
        </p>
        <h1 style={{
          fontFamily: 'var(--ava-font-display)', fontSize: 'var(--ava-text-2xl)',
          fontWeight: 600, color: 'var(--ava-color-ink-900)', margin: '4px 0 0',
        }}>
          Riwayat &amp; tren
        </h1>
      </header>

      <RiwayatList readings={rows} trends={tr} />

      <p style={{ marginTop: 16 }}>
        <Link className="btn btn--ghost" href="/" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
          Kembali ke beranda
        </Link>
      </p>
    </div>
  );
}
