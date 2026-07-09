// apps/customer/app/akun/page.tsx — akun, consent, & pusat semua fitur.
import React from 'react';
import Link from 'next/link';
import { getCustomerAuth } from '../../lib/auth';
import { hasActiveConsent, wearableConsentActive, billingSummary, myProfile, linksAsPatient } from '../../lib/data';
import { myConsultations } from '../../lib/consult';
import { ConnBanner } from '../../components/ConnBanner';
import { ConsentToggle, SignOutButton, SignOutAllButton } from '../../components/AccountActions';
import { ProfileForm } from '../../components/ProfileForm';
import { DataPrivacy } from '../../components/DataPrivacy';

export const dynamic = 'force-dynamic';

const FEATURES: { href: string; label: string; desc: string; icon: string }[] = [
  { href: '/riwayat', label: 'Riwayat & tren', desc: 'Semua hasil pemeriksaan', icon: 'chart' },
  { href: '/catat', label: 'Catat panel lengkap', desc: 'Isi banyak parameter sekaligus', icon: 'edit' },
  { href: '/rewards', label: 'Lencana & rewards', desc: 'Pencapaian kebiasaan sehat', icon: 'award' },
  { href: '/perangkat', label: 'Perangkat & smartwatch', desc: 'Hubungkan wearable, lihat tren', icon: 'watch' },
  { href: '/pendamping', label: 'Pendamping keluarga', desc: 'Berbagi & memantau', icon: 'users' },
  { href: '/kerja', label: 'Wellness kantor', desc: 'Program pemberi kerja', icon: 'briefcase' },
  { href: '/notifikasi', label: 'Notifikasi', desc: 'Pengingat & nudge', icon: 'bell' },
  { href: '/langganan', label: 'Langganan', desc: 'Kelola paket Premium', icon: 'star' },
];

function MenuIcon({ name }: { name: string }) {
  const p: Record<string, React.ReactNode> = {
    chart: <><path d="M3 3v18h18" /><path d="M7 15l3-4 3 2 4-6" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
    award: <><circle cx="12" cy="8" r="5" /><path d="M8.2 12 7 22l5-3 5 3-1.2-10" /></>,
    watch: <><rect x="6" y="6" width="12" height="12" rx="3" /><path d="M9 6l.5-3h5l.5 3M9 18l.5 3h5l.5-3" /></>,
    users: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 4a3.5 3.5 0 0 1 0 7M21 20c0-2.3-1.3-4.3-3.2-5.3" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
    star: <><path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8L6.6 19.6l1-6L3.3 9.4l6-.9Z" /></>,
  };
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {p[name] ?? p.chart}
    </svg>
  );
}

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
      <header className="phead">
        <p className="phead__kicker">Akun</p>
        <h1 className="phead__title">Profil & pengaturan</h1>
      </header>

      {/* Identitas — kartu profil premium */}
      <div className="pfp">
        <div className="pfp__avatar">{(profile.fullName?.[0] ?? auth.email?.[0] ?? 'A').toUpperCase()}</div>
        <div style={{ minWidth: 0 }}>
          <div className="pfp__name">{profile.fullName || 'Pengguna AVA'}</div>
          <div className="pfp__mail">{auth.email ?? 'Masyarakat'}</div>
        </div>
        <span className={`pfp__plan ${billing.effective === 'premium' ? 'is-premium' : ''}`}>
          {billing.effective === 'premium' ? '★ Premium' : 'Gratis'}
        </span>
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
      <div className="menu">
        {FEATURES.map((f) => (
          <Link key={f.href} href={f.href} className="menu__item">
            <span className="menu__ic"><MenuIcon name={f.icon} /></span>
            <div className="menu__main">
              <div className="menu__label">{f.label}</div>
              <div className="menu__desc">{f.desc}</div>
            </div>
            <svg className="menu__arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
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

      {/* Keamanan */}
      <div className="section-h">Keamanan</div>
      <SignOutAllButton />

      {/* Data & privasi */}
      <div className="section-h">Data & privasi</div>
      <DataPrivacy />

      {/* Keluar */}
      <div style={{ marginTop: 20 }}><SignOutButton /></div>
    </div>
  );
}
