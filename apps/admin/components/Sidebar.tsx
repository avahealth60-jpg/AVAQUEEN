'use client';
// apps/admin/components/Sidebar.tsx — rail navigasi konsol.
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Item { href: string; label: string; }
interface Group { title: string; items: Item[]; }

const GROUPS: Group[] = [
  {
    title: 'Operasi',
    items: [
      { href: '/', label: 'Ringkasan' },
      { href: '/qc', label: 'Monitoring QC' },
      { href: '/armada', label: 'Armada alat' },
    ],
  },
  {
    title: 'Jaringan',
    items: [
      { href: '/mitra', label: 'Mitra' },
    ],
  },
  {
    title: 'Tata kelola',
    items: [
      { href: '/kepatuhan', label: 'Kepatuhan' },
      { href: '/keuangan', label: 'Keuangan' },
      { href: '/konfigurasi', label: 'Konfigurasi' },
    ],
  },
];

export function Sidebar({ alertCount = 0 }: { alertCount?: number }) {
  const path = usePathname();
  const isActive = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));

  return (
    <nav className="rail" aria-label="Navigasi konsol">
      <div className="rail__brand">
        <div className="rail__mark">A</div>
        <div>
          <div className="rail__name">AVA Admin</div>
          <div className="rail__sub">Konsol kepercayaan QC</div>
        </div>
      </div>

      {GROUPS.map((g) => (
        <React.Fragment key={g.title}>
          <div className="rail__group">{g.title}</div>
          {g.items.map((it) => {
            const active = isActive(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className="navlink"
                aria-current={active ? 'page' : undefined}
              >
                <span className="navlink__dot" aria-hidden />
                {it.label}
                {it.href === '/qc' && alertCount > 0 && (
                  <span className="navlink__badge" aria-label={`${alertCount} perlu tindakan`}>
                    {alertCount}
                  </span>
                )}
              </Link>
            );
          })}
        </React.Fragment>
      ))}
    </nav>
  );
}
