'use client';
// apps/admin/components/QcTable.tsx — tabel armada dengan filter (client).
import React, { useMemo, useState } from 'react';
import { QcTag, DueTag, BadgeTag } from './widgets';
import type { DerivedRow } from '../lib/derive';

type Filter = 'all' | 'action' | 'overdue' | 'failed';

export function QcTable({ rows }: { rows: DerivedRow[] }) {
  const [filter, setFilter] = useState<Filter>('all');

  const shown = useMemo(() => {
    switch (filter) {
      case 'action': return rows.filter((r) => r.needsAction);
      case 'overdue': return rows.filter((r) => r.due === 'overdue');
      case 'failed': return rows.filter((r) => r.qc === 'gagal');
      default: return rows;
    }
  }, [rows, filter]);

  const tab = (key: Filter, label: string) => (
    <button aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>
  );

  return (
    <>
      <div className="seg" role="group" aria-label="Filter armada">
        {tab('all', `Semua (${rows.length})`)}
        {tab('action', `Perlu tindakan (${rows.filter((r) => r.needsAction).length})`)}
        {tab('overdue', `Lewat tempo (${rows.filter((r) => r.due === 'overdue').length})`)}
        {tab('failed', `QC gagal (${rows.filter((r) => r.qc === 'gagal').length})`)}
      </div>

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Serial</th><th>Model</th><th>Vendor</th>
              <th>QC terakhir</th><th>Kalibrasi</th><th>Jatuh tempo</th><th>Badge</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>
                Tidak ada alat pada filter ini.
              </td></tr>
            ) : shown.map((r) => (
              <tr key={r.deviceId}>
                <td className="mono">{r.serial}</td>
                <td>{r.modelName}<br /><span style={{ color: 'var(--muted)', fontSize: 12 }}>{r.category ?? ''}</span></td>
                <td>{r.vendorName}</td>
                <td><QcTag qc={r.qc} /></td>
                <td className="mono" style={{ color: 'var(--muted)' }}>{r.performedAt ?? '—'}</td>
                <td><DueTag status={r.due} date={r.nextDueAt} /></td>
                <td><BadgeTag active={r.badgeActive} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
