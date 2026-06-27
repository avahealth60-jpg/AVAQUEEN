import { describe, it, expect } from 'vitest';
import {
  addMonths,
  nextDueAt,
  daysUntilDue,
  isOverdue,
  reminderStatus,
  canIssueBadge,
  badgeExpiry,
  badgeStatus,
  decideBadge,
} from '../src/calibration.js';

const d = (iso: string) => new Date(iso);

describe('addMonths — aman terhadap akhir bulan', () => {
  it('31 Jan + 1 bulan → 28 Feb (tahun non-kabisat)', () => {
    expect(addMonths(d('2025-01-31T00:00:00Z'), 1).toISOString()).toBe('2025-02-28T00:00:00.000Z');
  });
  it('31 Jan + 1 bulan → 29 Feb (kabisat)', () => {
    expect(addMonths(d('2024-01-31T00:00:00Z'), 1).toISOString()).toBe('2024-02-29T00:00:00.000Z');
  });
  it('lintas tahun', () => {
    expect(addMonths(d('2025-11-15T00:00:00Z'), 3).toISOString()).toBe('2026-02-15T00:00:00.000Z');
  });
});

describe('nextDueAt', () => {
  it('interval 12 bulan', () => {
    expect(nextDueAt(d('2025-03-10T00:00:00Z'), 12).toISOString()).toBe('2026-03-10T00:00:00.000Z');
  });
  it('menolak interval non-positif / non-integer', () => {
    expect(() => nextDueAt(d('2025-01-01T00:00:00Z'), 0)).toThrow();
    expect(() => nextDueAt(d('2025-01-01T00:00:00Z'), -1)).toThrow();
    expect(() => nextDueAt(d('2025-01-01T00:00:00Z'), 1.5)).toThrow();
  });
});

describe('daysUntilDue / isOverdue', () => {
  const due = d('2025-06-30T00:00:00Z');
  it('hitung mundur positif', () => {
    expect(daysUntilDue(due, d('2025-06-20T00:00:00Z'))).toBe(10);
  });
  it('sudah lewat → negatif & overdue', () => {
    expect(daysUntilDue(due, d('2025-07-05T00:00:00Z'))).toBe(-5);
    expect(isOverdue(due, d('2025-07-05T00:00:00Z'))).toBe(true);
    expect(isOverdue(due, d('2025-06-29T00:00:00Z'))).toBe(false);
  });
});

describe('reminderStatus (cron)', () => {
  const due = d('2025-06-30T00:00:00Z');
  it('jauh dari tempo → ok', () => {
    expect(reminderStatus(due, d('2025-05-01T00:00:00Z'), 30)).toBe('ok');
  });
  it('dalam jendela 30 hari → due_soon', () => {
    expect(reminderStatus(due, d('2025-06-10T00:00:00Z'), 30)).toBe('due_soon');
  });
  it('lewat → overdue', () => {
    expect(reminderStatus(due, d('2025-07-01T00:00:00Z'), 30)).toBe('overdue');
  });
});

describe('badge lifecycle', () => {
  it('hanya QC lulus yang boleh menerbitkan badge', () => {
    expect(canIssueBadge('lulus')).toBe(true);
    expect(canIssueBadge('perlu_tinjau')).toBe(false);
    expect(canIssueBadge('gagal')).toBe(false);
  });
  it('masa berlaku mengikuti interval kalibrasi', () => {
    expect(badgeExpiry(d('2025-01-15T00:00:00Z'), 12).toISOString()).toBe('2026-01-15T00:00:00.000Z');
  });
  it('status active vs expired', () => {
    const exp = d('2026-01-15T00:00:00Z');
    expect(badgeStatus(exp, d('2025-12-01T00:00:00Z'))).toBe('active');
    expect(badgeStatus(exp, d('2026-02-01T00:00:00Z'))).toBe('expired');
  });

  it('decideBadge: gagal → tidak terbit, dengan alasan', () => {
    const r = decideBadge({ qc: 'gagal', performedAt: d('2025-01-15T00:00:00Z'), intervalMonths: 12 });
    expect(r.issued).toBe(false);
    expect(r.reason).toMatch(/tidak diterbitkan/);
    expect(r.expiresAt).toBeUndefined();
  });
  it('decideBadge: lulus → terbit dengan expiry', () => {
    const r = decideBadge({ qc: 'lulus', performedAt: d('2025-01-15T00:00:00Z'), intervalMonths: 6 });
    expect(r.issued).toBe(true);
    expect(r.expiresAt?.toISOString()).toBe('2025-07-15T00:00:00.000Z');
  });
});
