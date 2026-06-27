// apps/admin/lib/data.ts
// Pembungkus sisi-server: mengikat query @ava/db ke klien service-role.
// HANYA diimpor oleh Server Components (jangan impor dari komponen 'use client').
// Mengembalikan data kosong bila env belum diset (banner, bukan crash).
import {
  adminServerClient, isConfigured,
  getFleet, getPartners, getDashboardStats, getConsents, getAuditLogs,
} from '@ava/db';

export { isConfigured };

export function fleet() { return getFleet(adminServerClient()); }
export function partners() { return getPartners(adminServerClient()); }
export function stats(now?: Date) { return getDashboardStats(adminServerClient(), now); }
export function consents() { return getConsents(adminServerClient()); }
export function auditLogs(limit?: number) { return getAuditLogs(adminServerClient(), limit); }
