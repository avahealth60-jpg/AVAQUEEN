'use client';
/**
 * AVA Admin · QC Monitoring Engine (wedge).
 * Memantau status kalibrasi & badge seluruh armada mitra secara real-time.
 * Data nyata datang dari Supabase (RLS: hanya ava_admin). Di sini disuntik
 * contoh + memakai logika @ava/domain untuk status & jatuh tempo.
 */
import React, { useMemo, useState } from 'react';
import { reminderStatus, badgeStatus, type QcResult } from '@ava/domain';
import { VerifiedBadge } from '@ava/ui';

interface FleetRow {
  serial: string;
  vendor: string;
  model: string;
  qc: QcResult;
  performedAt: string;
  nextDueAt: string;
  badgeExpiresAt: string;
}

// Contoh; di produksi di-fetch dari view qc_fleet (RLS ava_admin).
const SAMPLE: FleetRow[] = [
  { serial: 'SN-V1-001', vendor: 'Vendor Satu', model: 'Tensimeter A', qc: 'lulus', performedAt: '2025-01-15', nextDueAt: '2026-01-15', badgeExpiresAt: '2026-01-15' },
  { serial: 'SN-V1-002', vendor: 'Vendor Satu', model: 'Glukometer B', qc: 'perlu_tinjau', performedAt: '2024-08-01', nextDueAt: '2025-08-01', badgeExpiresAt: '2025-08-01' },
  { serial: 'SN-V2-001', vendor: 'Vendor Dua', model: 'Oximeter C', qc: 'gagal', performedAt: '2024-03-10', nextDueAt: '2025-03-10', badgeExpiresAt: '2025-03-10' },
];

export default function QcDashboard() {
  const now = new Date();
  const [filter, setFilter] = useState<'all' | 'attention'>('all');

  const rows = useMemo(() => {
    return SAMPLE.map((r) => ({
      ...r,
      due: reminderStatus(new Date(r.nextDueAt), now),
      badge: badgeStatus(new Date(r.badgeExpiresAt), now),
    })).filter((r) => filter === 'all' || r.due !== 'ok' || r.qc !== 'lulus');
  }, [filter]);

  return (
    <main style={{ fontFamily: 'system-ui', padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A' }}>QC Monitoring Engine</h1>
      <p style={{ color: '#475569' }}>Status kalibrasi & badge armada mitra.</p>

      <div style={{ margin: '12px 0' }}>
        <button onClick={() => setFilter('all')} style={btn(filter === 'all')}>Semua</button>
        <button onClick={() => setFilter('attention')} style={btn(filter === 'attention')}>Perlu tindakan</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>
            <th style={th}>Serial</th><th style={th}>Vendor</th><th style={th}>Model</th>
            <th style={th}>QC</th><th style={th}>Jatuh tempo</th><th style={th}>Badge</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.serial} style={{ borderBottom: '1px solid #F1F5F9' }}>
              <td style={td}>{r.serial}</td>
              <td style={td}>{r.vendor}</td>
              <td style={td}>{r.model}</td>
              <td style={td}><QcTag qc={r.qc} /></td>
              <td style={td}><DueTag due={r.due} date={r.nextDueAt} /></td>
              <td style={td}><VerifiedBadge status={r.badge} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

function QcTag({ qc }: { qc: QcResult }) {
  const c = { lulus: '#15803D', perlu_tinjau: '#B45309', gagal: '#B91C1C' }[qc];
  return <span style={{ color: c, fontWeight: 600 }}>{qc}</span>;
}
function DueTag({ due, date }: { due: 'ok' | 'due_soon' | 'overdue'; date: string }) {
  const map = { ok: ['#15803D', date], due_soon: ['#B45309', `${date} (segera)`], overdue: ['#B91C1C', `${date} (lewat!)`] } as const;
  const [c, label] = map[due];
  return <span style={{ color: c }}>{label}</span>;
}
const th: React.CSSProperties = { padding: '8px 6px', fontWeight: 600, color: '#334155' };
const td: React.CSSProperties = { padding: '8px 6px' };
const btn = (active: boolean): React.CSSProperties => ({
  marginRight: 8, padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
  border: '1px solid #CBD5E1', background: active ? '#0E7C66' : '#fff', color: active ? '#fff' : '#0F172A',
});
