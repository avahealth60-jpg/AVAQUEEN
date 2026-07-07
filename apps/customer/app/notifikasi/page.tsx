// apps/customer/app/notifikasi/page.tsx — kotak masuk notifikasi.
import React from 'react';
import Link from 'next/link';
import { getCustomerAuth } from '../../lib/auth';
import { notifications } from '../../lib/data';
import { ConnBanner } from '../../components/ConnBanner';
import { NotificationList } from '../../components/NotificationList';
import { PushToggle } from '../../components/PushToggle';

export const dynamic = 'force-dynamic';

export default async function NotifikasiPage() {
  const { configured } = await getCustomerAuth();
  if (!configured) return <div className="screen"><ConnBanner /></div>;

  const items = await notifications();

  return (
    <div className="screen">
      <header style={{ marginBottom: 'var(--ava-space-5)' }}>
        <p style={{
          fontFamily: 'var(--ava-font-mono)', fontSize: 'var(--ava-text-xs)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--ava-color-trust-600)', margin: 0,
        }}>
          Notifikasi
        </p>
        <h1 style={{
          fontFamily: 'var(--ava-font-display)', fontSize: 'var(--ava-text-2xl)',
          fontWeight: 600, color: 'var(--ava-color-ink-900)', margin: '4px 0 0',
        }}>
          Kotak masuk
        </h1>
      </header>

      <PushToggle />

      <NotificationList items={items} />

      <p style={{ marginTop: 16 }}>
        <Link className="btn btn--ghost" href="/" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
          Kembali ke beranda
        </Link>
      </p>
    </div>
  );
}
