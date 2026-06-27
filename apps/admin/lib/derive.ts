// apps/admin/lib/derive.ts
// Turunan status tampilan dari FleetRow memakai logika @ava/domain.
// Murni & deterministik — aman dipakai di server maupun client.
import { reminderStatus, badgeStatus, type CalibrationReminderStatus } from '@ava/domain';
import type { FleetRow } from '@ava/db';

export interface DerivedRow extends FleetRow {
  due: CalibrationReminderStatus | null;
  badgeActive: boolean;
  needsAction: boolean;
  severity: number; // 3=gagal/overdue, 2=perlu_tinjau/segera, 1=belum, 0=aman
}

export function derive(row: FleetRow, now: Date): DerivedRow {
  const due = row.nextDueAt ? reminderStatus(new Date(row.nextDueAt), now) : null;
  const badgeActive = row.badgeExpiresAt
    ? badgeStatus(new Date(row.badgeExpiresAt), now) === 'active'
    : false;

  let severity = 0;
  if (row.qc === 'gagal' || due === 'overdue') severity = 3;
  else if (row.qc === 'perlu_tinjau' || due === 'due_soon') severity = 2;
  else if (!row.qc || !badgeActive) severity = 1;

  return { ...row, due, badgeActive, needsAction: severity > 0, severity };
}

export function deriveAll(rows: FleetRow[], now: Date): DerivedRow[] {
  return rows.map((r) => derive(r, now)).sort((a, b) => b.severity - a.severity);
}
