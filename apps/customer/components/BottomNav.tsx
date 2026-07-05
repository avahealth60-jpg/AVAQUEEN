'use client';
// apps/customer/components/BottomNav.tsx — V1.1.1
// Menu bawah yang membaca navigasi dari @ava/ui (satu sumber kebenaran).
// Menampilkan 5 menu utama; sisanya (Riwayat, Wellness, Rewards) diakses dari Beranda.
// Tanpa dependency ikon eksternal — ikon SVG inline agar pasti jalan.
import React from 'react';
import { usePathname } from 'next/navigation';
import { getNav } from '@ava/ui';

// Menu yang muncul di bar bawah (mobile: maksimal ~5 agar tetap terbaca).
// Sisanya (perangkat, pendamping, kerja, langganan, notifikasi) diakses dari
// kartu di Beranda & halaman Akun.
const PRIMARY = ['beranda', 'wellness', 'toko', 'konsultasi', 'akun'];

function Icon({ id, active }: { id: string; active: boolean }) {
  const c = active ? 'var(--ava-color-trust-600)' : 'var(--ava-color-ink-500)';
  const common = {
    width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none',
    stroke: c, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };
  switch (id) {
    case 'beranda':
      return (<svg {...common}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>);
    case 'wellness': // daun/tunas
      return (<svg {...common}><path d="M11 20A7 7 0 0 1 4 13c4 0 7 1 9 4" /><path d="M11 20c0-6 3-10 9-11 0 5-3 10-9 11z" /></svg>);
    case 'toko': // kantong belanja
      return (<svg {...common}><path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8a3 3 0 0 1 6 0" /></svg>);
    case 'konsultasi':
      return (<svg {...common}><rect x="3" y="6" width="12" height="12" rx="2" /><path d="M15 10l6-3v10l-6-3z" /></svg>);
    case 'akun':
      return (<svg {...common}><circle cx="12" cy="8" r="4" /><path d="M5 21c0-4 3-6 7-6s7 2 7 6" /></svg>);
    default:
      return (<svg {...common}><circle cx="12" cy="12" r="9" /></svg>);
  }
}

export function BottomNav() {
  const pathname = usePathname() ?? '/';
  const nav = getNav('customer');
  const items = PRIMARY
    .map((id) => nav.items.find((i) => i.id === id))
    .filter((i): i is NonNullable<typeof i> => Boolean(i));

  return (
    <nav
      aria-label="Navigasi utama"
      style={{
        position: 'sticky', bottom: 0, zIndex: 10,
        display: 'flex', background: 'var(--ava-color-surface-0)',
        borderTop: '1px solid var(--ava-color-line)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
    >
      {items.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        const short = item.label.split(' ')[0];
        return (
          <a
            key={item.id}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, padding: '9px 0 8px', textDecoration: 'none',
              color: active ? 'var(--ava-color-trust-600)' : 'var(--ava-color-ink-500)',
              background: active ? 'var(--ava-color-trust-100)' : 'transparent',
            }}
          >
            <Icon id={item.id} active={active} />
            <span style={{ fontSize: 11, fontWeight: active ? 600 : 500 }}>{short}</span>
          </a>
        );
      })}
    </nav>
  );
}
