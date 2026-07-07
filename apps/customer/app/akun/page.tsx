// apps/customer/app/akun/page.tsx — akun, consent, & pusat semua fitur.
import React from 'react';
import Link from 'next/link';
import { getCustomerAuth } from '../../lib/auth';
import { hasActiveConsent, wearableConsentActive, billingSummary, myProfile, linksAsPatient } from '../../lib/data';
import { myConsultations } from '../../lib/consult';
import { ConnBanner } from '../../components/ConnBanner';
import { ConsentToggle, SignOutButton } from '../../components/AccountActions';
import { ProfileForm } from '../../components/ProfileForm';
import { DataPrivacy } from '../../components/DataPrivacy';

export const dynamic = 'force-dynamic';

const FEATURES: { href: string; label: string; desc: string }[] = [
  { href: '/riwayat', label: 'Riwayat & tren', desc: 'Semua hasil pemeriksaan' },
  { href: '/catat', label: 'Catat panel lengkap', desc: 'Isi banyak parameter sekaligus' },
  { href: '/rewards', label: 'Lencana & rewards', desc: 'Pencapaian kebiasaan sehat' },
  { href: '/perangkat', label: 'Perangkat & smartwatch', desc: 'Hubungkan wearable, lihat tren' },
  { href: '/pendamping', label: 'Pendamping keluarga', desc: 'Berbagi & memantau' },
  { href: '/kerja', label: 'Wellness kantor', desc: 'Program pemberi kerja' },
  { href: '/notifikasi', label: 'Notifikasi', desc: 'Pengingat & nudge' },
  { href: '/langganan', label: 'Langganan', desc: 'Kelola paket Premium' },
];

export default async function AkunPage() {
  const auth = await getCustomerAuth();
  if (!auth.configured) return <div className="screen"><ConnBanner /></div>;

  const [consent, wearable, billing, profile, caregivers, consults] = await Promise.all([
    hasActiveConsent(), wearableConsentActive(), billingSummary(), myProfile(),
    linksAsPatient(), myConsultations(),
  ]);
  const activeCaregivers = caregivers.filter((c) => c.status === 'active');
  const sharingDoctors = consults.filter((c) => c.sharedCount > 0 && c.status !== 'cancelled');
  const SCOPE_LABEL: Record<string, string> = { readings: 'Hasil', wellness: 'Wellness', consultations: 'Konsultasi' };

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

      {/* Profil medis */}
      <div className="section-h">Profil medis</div>
      <ProfileForm profile={profile} />

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

      {/* Siapa yang bisa melihat datamu (transparansi) */}
      <div className="section-h">Siapa yang bisa melihat datamu</div>
      <div className="card">
        {activeCaregivers.length === 0 && sharingDoctors.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--ava-color-ink-500)' }}>
            Hanya kamu. Belum ada pendamping atau dokter yang kamu beri akses.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {activeCaregivers.map((c) => (
              <div className="read" key={c.id}>
                <div className="read__main">
                  <div className="read__label">Pendamping</div>
                  <div className="read__meta">Akses: {c.scopes.map((s) => SCOPE_LABEL[s] ?? s).join(', ')}</div>
                </div>
                <Link className="btn btn--ghost" href="/pendamping" style={{ width: 'auto', textDecoration: 'none' }}>Kelola</Link>
              </div>
            ))}
            {sharingDoctors.map((c) => (
              <div className="read" key={c.id}>
                <div className="read__main">
                  <div className="read__label">{c.doctorName}</div>
                  <div className="read__meta">Dokter · {c.sharedCount} hasil dibagikan untuk konsultasi</div>
                </div>
                <span className="pill pill--normal">Dokter</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data & privasi */}
      <div className="section-h">Data & privasi</div>
      <DataPrivacy />

      {/* Keluar */}
      <div style={{ marginTop: 20 }}><SignOutButton /></div>
    </div>
  );
}
