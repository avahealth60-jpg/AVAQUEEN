// apps/customer/app/page.tsx — beranda: consent-gate → input → riwayat. (V1.1.1 header)
import React from 'react';
import { getCustomerAuth } from '../lib/auth';
import { hasActiveConsent, liveWellnessNudges, unreadCount, billingSummary } from '../lib/data';
import Link from 'next/link';
import { ConsentCard } from '../components/ConsentCard';
import { PanelForm } from '../components/PanelForm';
import { History } from '../components/History';
import { ConnBanner } from '../components/ConnBanner';
import { OnboardingHint } from '../components/OnboardingHint';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { configured } = await getCustomerAuth();
  if (!configured) return <div className="screen"><ConnBanner /></div>;

  const consent = await hasActiveConsent();
  const [nudges, unread, billing] = consent
    ? await Promise.all([liveWellnessNudges(), unreadCount(), billingSummary()])
    : [[], 0, null];
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
          <OnboardingHint />

          <Link
            href="/notifikasi"
            className="card"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, textDecoration: 'none', marginBottom: 'var(--ava-space-3)',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--ava-color-ink-900)' }}>Notifikasi</div>
            {unread > 0 ? (
              <span className="pill" style={{ background: 'var(--ava-color-trust-100)', color: 'var(--ava-color-trust-600)' }}>
                {unread} baru
              </span>
            ) : (
              <span style={{ fontSize: 22, color: 'var(--ava-color-trust-600)' }} aria-hidden>→</span>
            )}
          </Link>

          {nudges.length > 0 && (
            <div className="card card--brand" style={{ marginBottom: 'var(--ava-space-3)' }}>
              {nudges.map((n, i) => (
                <div key={i} style={{ padding: i === 0 ? '0 0 8px' : '8px 0', borderTop: i === 0 ? 'none' : '1px solid var(--ava-color-line)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--ava-color-ink-900)', fontSize: 14 }}>{n.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--ava-color-ink-500)' }}>{n.body}</div>
                </div>
              ))}
            </div>
          )}

          <div className="section-h">Catat pemeriksaan</div>
          <PanelForm />

          <Link
            href="/perangkat"
            className="card"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, textDecoration: 'none', marginTop: 'var(--ava-space-3)',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: 'var(--ava-color-ink-900)' }}>
                Hubungkan smartwatch
              </div>
              <div style={{ fontSize: 14, color: 'var(--ava-color-ink-500)' }}>
                Tarik langkah, tidur & detak jantung otomatis
              </div>
            </div>
            <span aria-hidden style={{ fontSize: 22, color: 'var(--ava-color-trust-600)' }}>→</span>
          </Link>

          <Link
            href="/wellness"
            className="card"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, textDecoration: 'none', marginTop: 'var(--ava-space-3)',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: 'var(--ava-color-ink-900)' }}>
                Program wellness
              </div>
              <div style={{ fontSize: 14, color: 'var(--ava-color-ink-500)' }}>
                Bangun kebiasaan sehat: langkah, tidur, hidrasi
              </div>
            </div>
            <span aria-hidden style={{ fontSize: 22, color: 'var(--ava-color-trust-600)' }}>→</span>
          </Link>

          <Link
            href="/pendamping"
            className="card"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, textDecoration: 'none', marginTop: 'var(--ava-space-3)',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: 'var(--ava-color-ink-900)' }}>
                Pendamping keluarga
              </div>
              <div style={{ fontSize: 14, color: 'var(--ava-color-ink-500)' }}>
                Bagikan kondisimu ke keluarga, atau pantau orang tersayang
              </div>
            </div>
            <span aria-hidden style={{ fontSize: 22, color: 'var(--ava-color-trust-600)' }}>→</span>
          </Link>

          <Link
            href="/langganan"
            className="card"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, textDecoration: 'none', marginTop: 'var(--ava-space-3)',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: 'var(--ava-color-ink-900)' }}>
                Langganan {billing?.effective === 'premium' ? 'Premium' : 'AVA'}
              </div>
              <div style={{ fontSize: 14, color: 'var(--ava-color-ink-500)' }}>
                {billing?.effective === 'premium'
                  ? 'Aktif — nikmati diskon konsultasi & wellness lanjutan'
                  : 'Upgrade ke Premium: diskon konsultasi & lebih banyak'}
              </div>
            </div>
            {billing?.effective === 'premium'
              ? <span className="pill pill--normal" style={{ whiteSpace: 'nowrap' }}>Premium</span>
              : <span aria-hidden style={{ fontSize: 22, color: 'var(--ava-color-trust-600)' }}>→</span>}
          </Link>

          <Link
            href="/rewards"
            className="card"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, textDecoration: 'none', marginTop: 'var(--ava-space-3)',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: 'var(--ava-color-ink-900)' }}>Lencana &amp; rewards</div>
              <div style={{ fontSize: 14, color: 'var(--ava-color-ink-500)' }}>Kumpulkan pencapaian dari kebiasaan sehat</div>
            </div>
            <span aria-hidden style={{ fontSize: 22, color: 'var(--ava-color-trust-600)' }}>→</span>
          </Link>

          <Link
            href="/toko"
            className="card"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, textDecoration: 'none', marginTop: 'var(--ava-space-3)',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: 'var(--ava-color-ink-900)' }}>
                Toko alat terverifikasi
              </div>
              <div style={{ fontSize: 14, color: 'var(--ava-color-ink-500)' }}>
                Beli alat ber-badge AVA Verified
              </div>
            </div>
            <span aria-hidden style={{ fontSize: 22, color: 'var(--ava-color-trust-600)' }}>→</span>
          </Link>

          <Link
            href="/kerja"
            className="card"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, textDecoration: 'none', marginTop: 'var(--ava-space-3)',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: 'var(--ava-color-ink-900)' }}>
                Wellness dari kantor
              </div>
              <div style={{ fontSize: 14, color: 'var(--ava-color-ink-500)' }}>
                Gabung program pemberi kerja — data tetap privat
              </div>
            </div>
            <span aria-hidden style={{ fontSize: 22, color: 'var(--ava-color-trust-600)' }}>→</span>
          </Link>

          <History />
        </>
      )}
    </div>
  );
}
