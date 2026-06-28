// packages/ui — bahasa visual bersama (cuplikan inti).
import React from 'react';

type Triage = 'normal' | 'perhatian' | 'segera';
const TRIAGE_LABEL: Record<Triage, string> = {
  normal: 'Normal', perhatian: 'Perlu Perhatian', segera: 'Segera Konsultasi',
};
const TRIAGE_COLOR: Record<Triage, string> = {
  normal: '#15803D', perhatian: '#B45309', segera: '#B91C1C',
};

export function TriagePill({ triage }: { triage: Triage }) {
  return (
    <span
      style={{
        background: TRIAGE_COLOR[triage], color: '#fff',
        padding: '2px 10px', borderRadius: 999, fontSize: 13, fontWeight: 600,
      }}
    >
      {TRIAGE_LABEL[triage]}
    </span>
  );
}

export function VerifiedBadge({ status }: { status: 'active' | 'expired' }) {
  const ok = status === 'active';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600,
      color: ok ? '#0E7C66' : '#6B7280' }}>
      {ok ? '✓ AVA Verified' : '○ Verifikasi kedaluwarsa'}
    </span>
  );
}

export const EDU_DISCLAIMER =
  'Informasi ini bersifat edukatif dan BUKAN diagnosis. Konsultasikan dengan tenaga kesehatan berlisensi.';
export * from './v110.js';