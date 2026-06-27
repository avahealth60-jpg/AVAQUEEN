/**
 * Penjadwalan kalibrasi & siklus hidup badge "AVA Verified".
 * Semua tanggal di UTC; pembanding "now" disuntikkan agar deterministik (testable).
 */

import type { BadgeStatus, CalibrationReminderStatus, QcResult } from './types.js';

/** Tambah bulan dengan aman terhadap akhir bulan (31 Jan + 1 bln = 28/29 Feb). */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

const MS_PER_DAY = 86_400_000;

/** Tanggal kalibrasi berikutnya jatuh tempo. */
export function nextDueAt(performedAt: Date, intervalMonths: number): Date {
  if (!Number.isInteger(intervalMonths) || intervalMonths <= 0) {
    throw new Error(`intervalMonths harus bilangan bulat positif, diterima ${intervalMonths}.`);
  }
  return addMonths(performedAt, intervalMonths);
}

/** Selisih hari (dibulatkan ke bawah) dari now ke dueAt. Negatif = sudah lewat. */
export function daysUntilDue(dueAt: Date, now: Date): number {
  return Math.floor((dueAt.getTime() - now.getTime()) / MS_PER_DAY);
}

export function isOverdue(dueAt: Date, now: Date): boolean {
  return now.getTime() > dueAt.getTime();
}

/**
 * Status pengingat untuk cron schedule-reminders.
 * `dueSoonWindowDays` = berapa hari sebelum jatuh tempo mulai mengingatkan.
 */
export function reminderStatus(
  dueAt: Date,
  now: Date,
  dueSoonWindowDays = 30,
): CalibrationReminderStatus {
  if (isOverdue(dueAt, now)) return 'overdue';
  if (daysUntilDue(dueAt, now) <= dueSoonWindowDays) return 'due_soon';
  return 'ok';
}

/* --------------------------- BADGE --------------------------- */

/** Badge hanya boleh terbit jika QC LULUS. Gerbang keras. */
export function canIssueBadge(qc: QcResult): boolean {
  return qc === 'lulus';
}

/** Masa berlaku badge mengikuti interval kalibrasi alat. */
export function badgeExpiry(calibrationPerformedAt: Date, calibrationIntervalMonths: number): Date {
  return nextDueAt(calibrationPerformedAt, calibrationIntervalMonths);
}

export function badgeStatus(expiresAt: Date, now: Date): BadgeStatus {
  return now.getTime() <= expiresAt.getTime() ? 'active' : 'expired';
}

export interface IssueBadgeInput {
  readonly qc: QcResult;
  readonly performedAt: Date;
  readonly intervalMonths: number;
}

export interface IssueBadgeResult {
  readonly issued: boolean;
  readonly reason?: string;
  readonly expiresAt?: Date;
}

/** Keputusan terbit badge end-to-end (dipakai edge function issue-badge). */
export function decideBadge(input: IssueBadgeInput): IssueBadgeResult {
  if (!canIssueBadge(input.qc)) {
    return { issued: false, reason: `QC "${input.qc}" tidak lolos — badge tidak diterbitkan.` };
  }
  return { issued: true, expiresAt: badgeExpiry(input.performedAt, input.intervalMonths) };
}
