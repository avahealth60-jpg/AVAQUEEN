// apps/customer/app/akun/page.tsx — akun, consent, & pusat semua fitur.
import React from 'react';
import Link from 'next/link';
import { getCustomerAuth } from '../../lib/auth';
import { hasActiveConsent, wearableConsentActive, billingSummary } from '../../lib/data';
import { ConnBanner } from '../../components/ConnBanner';
import { ConsentToggle, SignOutButton } from '../../components/AccountActions';

export const dynamic = 'force-dynamic';

const FEATURES: { href: string; label: string; desc: string }[] = [
  { href: '/perangkat', label: 'Perangkat & smartwatch', desc: 'Hubungkan wearable, lihat tren' },
  { href: '/pendamping', label: 'Pendamping keluarga', desc: 'Berbagi & memantau' },
  { href: '/kerja', label: 'Wellness kantor', desc: 'Program pemberi kerja' },
  { href: '/notifikasi', label: 'Notifikasi', desc: 'Pengingat & nudge' },
  { href: '/langganan', label: 'Langganan', desc: 'Kelola paket Premium' },
];

export default async function AkunPage() {
  const auth = await getCustomerAuth();
  if (!auth.configured) return <div className="screen"><ConnBanner /></div>;

  const [consent, wearable, billing] = await Promise.all([
    hasActiveConsent(), wearableConsentActive(), billingSummary(),
  ]);

  return (
    <div className="screen">
      <header style={{ marginBottom: 'var(--ava-space-5)' }}>
        <p style={{
          fontFamily: 'var(--ava-font-mono)', fontSize: 'var(--ava-text-xs)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--ava-color-trust-600)', margin: 0,
        }}>
          Akun
        </p>
        <h1 style={{
          fontFamily: 'var(--ava-font-display)', fontSize: 'var(--ava-text-2xl)',
          fontWeight: 600, color: 'var(--ava-color-ink-900)', margin: '4px 0 0',
        }}>
          Profil & pengaturan
        </h1>
      </header>

      {/* Identitas */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--ava-color-ink-900)' }}>{auth.email ?? 'Pengguna'}</div>
            <div style={{ fontSize: 13, color: 'var(--ava-color-ink-500)' }}>Masuk sebagai Masyarakat</div>
          </div>
          <span className={`pill ${billing.effective === 'premium' ? 'pill--normal' : 'pill--none'}`}>
            {billing.effective === 'premium' ? 'Premium' : 'Gratis'}
          </span>
        </div>
      </div>

      {/* Consent */}
      <div className="section-h">Privasi & persetujuan</div>
      <div className="card"><ConsentToggle active={consent} /></div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--ava-color-ink-900)' }}>Sinkronisasi wearable</div>
            <div style={{ fontSize: 13, color: 'var(--ava-color-ink-500)' }}>
              {wearable ? 'Aktif — data perangkat boleh masuk.' : 'Nonaktif — atur di halaman Perangkat.'}
            </div>
          </div>
          <Link className="btn btn--ghost" href="/perangkat" style={{ width: 'auto', textDecoration: 'none' }}>Atur</Link>
        </div>
      </div>

      {/* Semua fitur */}
      <div className="section-h">Semua fitur</div>
      <div className="card" style={{ padding: 0 }}>
        {FEATURES.map((f, i) => (
          <Link key={f.href} href={f.href} className="read" style={{
            textDecoration: 'none', padding: '14px 18px',
            borderBottom: i < FEATURES.length - 1 ? '1px solid var(--ava-color-line)' : 'none',
          }}>
            <div className="read__main">
              <div className="read__label">{f.label}</div>
              <div className="read__meta">{f.desc}</div>
            </div>
            <span aria-hidden style={{ fontSize: 20, color: 'var(--ava-color-trust-600)' }}>→</span>
          </Link>
        ))}
      </div>

      {/* Keluar */}
      <div style={{ marginTop: 20 }}><SignOutButton /></div>
    </div>
  );
}
