'use client';
// apps/partner/components/PartnerNav.tsx — tab navigasi seksi per peran.
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { partnerSections } from '../lib/nav';

export function PartnerNav({ role, orgKind }: { role: string | null; orgKind: string | null }) {
  const path = usePathname() ?? '/';
  const sections = partnerSections(role, orgKind);
  if (sections.length === 0) return null;

  return (
    <nav aria-label="Navigasi seksi" style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', gap: 4, padding: '0 24px', overflowX: 'auto' }}>
        {sections.map((s) => {
          const active = s.href === '/' ? path === '/' : path.startsWith(s.href);
          return (
            <Link key={s.href} href={s.href}
              style={{
                padding: '12px 14px', fontSize: 14, fontWeight: active ? 700 : 500, textDecoration: 'none',
                color: active ? 'var(--accent-ink)' : 'var(--muted)',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                whiteSpace: 'nowrap',
              }}>
              {s.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
