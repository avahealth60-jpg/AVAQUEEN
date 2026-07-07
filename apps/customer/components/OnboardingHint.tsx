'use client';
// apps/customer/components/OnboardingHint.tsx — panduan awal, bisa ditutup.
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

const KEY = 'ava-onboarding-done';
const STEPS: { href: string; icon: string; title: string; desc: string }[] = [
  { href: '/akun', icon: '👤', title: 'Lengkapi profil', desc: 'Tinggi, berat, usia — untuk kalkulator & personalisasi' },
  { href: '/catat', icon: '📝', title: 'Catat pemeriksaan', desc: 'Masukkan hasil & dapat penjelasan edukatif' },
  { href: '/perangkat', icon: '⌚', title: 'Hubungkan smartwatch', desc: 'Tarik langkah & detak jantung otomatis' },
];

export function OnboardingHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { setShow(localStorage.getItem(KEY) !== '1'); } catch { setShow(true); }
  }, []);
  if (!show) return null;

  function dismiss() { try { localStorage.setItem(KEY, '1'); } catch { /* abaikan */ } setShow(false); }

  return (
    <div className="card card--brand" style={{ marginBottom: 'var(--ava-space-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ color: 'var(--ava-color-ink-900)' }}>Selamat datang di AVA 👋</strong>
        <button onClick={dismiss} aria-label="Tutup panduan"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ava-color-ink-500)', fontSize: 18, lineHeight: 1 }}>×</button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--ava-color-ink-500)', margin: '4px 0 10px' }}>Tiga langkah cepat untuk mulai:</p>
      <div style={{ display: 'grid', gap: 8 }}>
        {STEPS.map((s, i) => (
          <Link key={s.href} href={s.href} className="read" style={{ textDecoration: 'none', padding: '8px 0' }}>
            <span style={{ fontSize: 22, marginRight: 4 }}>{s.icon}</span>
            <div className="read__main">
              <div className="read__label">{i + 1}. {s.title}</div>
              <div className="read__meta" style={{ whiteSpace: 'normal' }}>{s.desc}</div>
            </div>
            <span aria-hidden style={{ color: 'var(--ava-color-trust-600)' }}>→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
