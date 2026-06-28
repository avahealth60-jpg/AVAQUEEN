'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BottomNav() {
  const path = usePathname();
  const tab = (href: string, label: string, icon: string) => {
    const active = href === '/' ? path === '/' : path.startsWith(href);
    return (
      <Link href={href} className={`bnav__tab${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}>
        <span className="bnav__icon" aria-hidden>{icon}</span>{label}
      </Link>
    );
  };
  return (
    <nav className="bnav" aria-label="Navigasi utama">
      {tab('/', 'Beranda', '🏠')}
      {tab('/konsultasi', 'Konsultasi', '💬')}
    </nav>
  );
}
