'use client';
// apps/admin/components/RoleLauncher.tsx — identitas Super Admin + "Buka sebagai".
// Peralihan lintas-app (deployment terpisah) + Inspektur in-app.
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ROLE_TARGETS } from '../lib/apps';

export function RoleLauncher({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const itemStyle: React.CSSProperties = {
    display: 'block', padding: '10px 12px', textDecoration: 'none',
    borderRadius: 10, color: 'var(--ava-color-ink-900, #102A23)',
  };

  return (
    <div ref={ref} style={{ position: 'relative', margin: '4px 10px 12px' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
          padding: '9px 10px', borderRadius: 12, border: '1px solid var(--ava-color-line, #E4ECE8)',
          background: 'var(--ava-color-surface-0, #fff)', font: 'inherit', textAlign: 'left',
        }}
      >
        <span style={{
          width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center',
          background: 'var(--ava-color-trust-600, #0E7C66)', color: '#fff', fontWeight: 800, fontSize: 13,
        }}>SA</span>
        <span style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
          <span style={{ display: 'block', fontWeight: 700, fontSize: 13 }}>Super Admin</span>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--ava-color-ink-500, #6B7F76)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {email ?? 'pemilik'}
          </span>
        </span>
        <span aria-hidden style={{ color: 'var(--ava-color-ink-500, #6B7F76)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 30,
            background: 'var(--ava-color-surface-0, #fff)', border: '1px solid var(--ava-color-line, #E4ECE8)',
            borderRadius: 14, padding: 6, boxShadow: '0 12px 32px rgba(16,42,35,.14)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ava-color-ink-500, #6B7F76)', padding: '6px 12px 4px' }}>
            Buka sebagai
          </div>
          {ROLE_TARGETS.map((t) =>
            t.external ? (
              <a key={t.key} href={t.url} target="_blank" rel="noreferrer" role="menuitem"
                style={itemStyle}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ava-color-trust-100, #E6F4EF)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                <strong style={{ display: 'block', fontSize: 13 }}>{t.label} ↗</strong>
                <span style={{ fontSize: 12, color: 'var(--ava-color-ink-500, #6B7F76)' }}>{t.desc}</span>
              </a>
            ) : (
              <Link key={t.key} href={t.url} role="menuitem" onClick={() => setOpen(false)}
                style={itemStyle}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ava-color-trust-100, #E6F4EF)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                <strong style={{ display: 'block', fontSize: 13 }}>{t.label}</strong>
                <span style={{ fontSize: 12, color: 'var(--ava-color-ink-500, #6B7F76)' }}>{t.desc}</span>
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  );
}
