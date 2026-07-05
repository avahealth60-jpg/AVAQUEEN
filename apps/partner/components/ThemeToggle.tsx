'use client';
// apps/partner/components/ThemeToggle.tsx — ganti tema terang/gelap (persist).
import React, { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    const stored = (typeof localStorage !== 'undefined' && localStorage.getItem('ava-theme')) || '';
    if (stored === 'dark' || stored === 'light') { setTheme(stored); return; }
    const sysDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    setTheme(document.documentElement.getAttribute('data-theme') === 'dark' || sysDark ? 'dark' : 'light');
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('ava-theme', next); } catch { /* abaikan */ }
  }

  const dark = theme === 'dark';
  return (
    <button
      className="topbar__signout"
      onClick={toggle}
      aria-label={dark ? 'Tema terang' : 'Tema gelap'}
      title={dark ? 'Tema terang' : 'Tema gelap'}
      suppressHydrationWarning
      style={{ marginRight: 8, display: 'inline-flex', alignItems: 'center', padding: '7px 10px' }}
    >
      {dark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
      )}
    </button>
  );
}
