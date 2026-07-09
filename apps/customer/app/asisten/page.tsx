// apps/customer/app/asisten/page.tsx — Asisten AVA: insight edukatif (bukan diagnosis).
import React from 'react';
import Link from 'next/link';
import { getCustomerAuth } from '../../lib/auth';
import { liveWellnessNudges, myProfile } from '../../lib/data';
import { ConnBanner } from '../../components/ConnBanner';

export const dynamic = 'force-dynamic';

function Spark() {
  return (
    <span className="ava-msg__ic" aria-hidden>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z" /><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7L19 15z" />
      </svg>
    </span>
  );
}

export default async function AsistenPage() {
  const { configured } = await getCustomerAuth();
  if (!configured) return <div className="screen"><ConnBanner /></div>;

  const [nudges, profile] = await Promise.all([liveWellnessNudges(), myProfile()]);
  const name = profile.fullName?.split(' ')[0] || 'Kamu';

  return (
    <div className="screen">
      <header className="phead">
        <p className="phead__kicker">Asisten AVA</p>
        <h1 className="phead__title">Insight harianmu</h1>
      </header>

      <div className="banner" style={{ color: 'var(--muted)', background: 'var(--brand-bg)', borderColor: 'color-mix(in srgb,var(--brand) 22%,transparent)' }}>
        AVA memberi ringkasan edukatif dari datamu — bukan diagnosis atau anjuran medis.
        Untuk keluhan kesehatan, hubungi tenaga kesehatan.
      </div>

      <div className="ava-msg">
        <Spark />
        <div className="ava-bubble">
          <div className="ava-bubble__title">Halo {name} 👋</div>
          <div className="ava-bubble__body">Ini yang kulihat dari kebiasaan &amp; pemeriksaanmu belakangan ini.</div>
        </div>
      </div>

      {nudges.length === 0 ? (
        <div className="ava-msg">
          <Spark />
          <div className="ava-bubble">
            <div className="ava-bubble__body">Belum banyak data untuk diringkas. Mulai dengan mencatat pemeriksaan atau ikut satu program wellness, ya.</div>
          </div>
        </div>
      ) : (
        nudges.map((n, i) => (
          <div className="ava-msg" key={i}>
            <Spark />
            <div className="ava-bubble">
              <div className="ava-bubble__title">{n.title}</div>
              <div className="ava-bubble__body">{n.body}</div>
            </div>
          </div>
        ))
      )}

      <div className="chips">
        <Link className="chip" href="/catat">＋ Catat pemeriksaan</Link>
        <Link className="chip" href="/wellness">Program wellness</Link>
        <Link className="chip" href="/riwayat">Lihat tren</Link>
        <Link className="chip" href="/konsultasi">Tanya dokter</Link>
      </div>
    </div>
  );
}
