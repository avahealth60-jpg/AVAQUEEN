'use client';
// apps/customer/components/home/HomeHero.tsx — sapaan + avatar + lonceng.
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

function greeting(h: number): string {
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 19) return 'Selamat sore';
  return 'Selamat malam';
}

export function HomeHero({ name, email, unread, scoreLabel }: { name: string | null; email: string | null; unread: number; scoreLabel: string }) {
  const [hi, setHi] = useState('Halo');
  useEffect(() => { setHi(greeting(new Date().getHours())); }, []);
  const display = name || (email ? email.split('@')[0] : undefined) || 'Kamu';
  const initial = (display[0] ?? 'A').toUpperCase();

  return (
    <header className="hero">
      <div className="hero__avatar">{initial}</div>
      <div className="hero__mid">
        <div className="hero__greet">{hi},</div>
        <div className="hero__name">{display} <span aria-hidden>👋</span></div>
        <div className="hero__status"><span className="hero__statusdot" />Tubuhmu dalam kondisi {scoreLabel.toLowerCase()} hari ini</div>
      </div>
      <Link href="/notifikasi" className="hero__bell" aria-label={`Notifikasi${unread ? `, ${unread} baru` : ''}`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
        {unread > 0 && <span className="hero__badge">{unread > 9 ? '9+' : unread}</span>}
      </Link>
    </header>
  );
}
