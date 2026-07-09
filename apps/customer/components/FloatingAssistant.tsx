'use client';
// apps/customer/components/FloatingAssistant.tsx — tombol mengambang ke Asisten AVA.
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function FloatingAssistant() {
  const pathname = usePathname() ?? '/';
  if (pathname.startsWith('/asisten')) return null; // jangan tampil di halamannya sendiri

  return (
    <Link href="/asisten" className="fab-ai" aria-label="Buka Asisten AVA">
      <span className="fab-ai__spark" aria-hidden>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z" />
        </svg>
      </span>
      <span className="fab-ai__txt">Tanya AVA</span>
    </Link>
  );
}
