// apps/customer/components/home/QuickActions.tsx — aksi cepat beranda.
import React from 'react';
import Link from 'next/link';

const ICON = {
  plus: <path d="M12 5v14M5 12h14" />,
  watch: <><rect x="6" y="7" width="12" height="10" rx="3" /><path d="M9 7V4h6v3M9 17v3h6v-3" /></>,
  video: <><rect x="3" y="6" width="12" height="12" rx="2" /><path d="M15 10l6-3v10l-6-3z" /></>,
  leaf: <path d="M11 20A7 7 0 0 1 4 13c4 0 7 1 9 4M11 20c0-6 3-10 9-11 0 5-3 10-9 11z" />,
};

const ACTIONS: { href: string; label: string; icon: keyof typeof ICON; tint: string }[] = [
  { href: '/catat', label: 'Input Hasil', icon: 'plus', tint: '#FF7A9A' },
  { href: '/perangkat', label: 'Smartwatch', icon: 'watch', tint: '#4CC9F0' },
  { href: '/konsultasi', label: 'Konsultasi', icon: 'video', tint: '#8B93FF' },
  { href: '/wellness', label: 'Wellness', icon: 'leaf', tint: '#14B89A' },
];

export function QuickActions() {
  return (
    <div className="qa-grid">
      {ACTIONS.map((a) => (
        <Link key={a.href} href={a.href} className="qa">
          <span className="qa__ic" style={{ background: `color-mix(in srgb, ${a.tint} 16%, transparent)`, color: a.tint }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{ICON[a.icon]}</svg>
          </span>
          <span className="qa__label">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}
