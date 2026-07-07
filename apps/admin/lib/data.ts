// apps/admin/lib/data.ts
// Pembungkus sisi-server: mengikat query @ava/db ke klien service-role.
// HANYA diimpor oleh Server Components (jangan impor dari komponen 'use client').
// Mengembalikan data kosong bila env belum diset (banner, bukan crash).
import {
  adminServerClient, isConfigured,
  getFleet, getPartners, getDashboardStats, getConsents, getAuditLogs, getCommissionStats,
  listProfilesByRole, listOrganizations, inspectCustomer, inspectDoctor,
} from '@ava/db';

export { isConfigured };

export function fleet() { return getFleet(adminServerClient()); }
export function partners() { return getPartners(adminServerClient()); }
export function stats(now?: Date) { return getDashboardStats(adminServerClient(), now); }
export function consents() { return getConsents(adminServerClient()); }
export function auditLogs(limit?: number) { return getAuditLogs(adminServerClient(), limit); }
export function commissionStats() { return getCommissionStats(adminServerClient()); }

// ── Verifikasi dokter ────────────────────────────────────────────
export interface DoctorVerif {
  id: string; name: string; strNo: string | null; sipNo: string | null; status: string;
}
export async function doctorsForVerification(): Promise<DoctorVerif[]> {
  const db = adminServerClient();
  if (!db) return [];
  const { data } = await db
    .from('profiles').select('id, full_name, str_no, sip_no, doctor_status')
    .eq('role', 'doctor').order('doctor_status', { ascending: true });
  return ((data ?? []) as { id: string; full_name: string | null; str_no: string | null; sip_no: string | null; doctor_status: string | null }[])
    .map((d) => ({ id: d.id, name: d.full_name ?? 'Dokter', strNo: d.str_no, sipNo: d.sip_no, status: d.doctor_status ?? 'pending' }));
}

// ── Keuangan multi-aliran (langganan + marketplace) ──────────────
export interface RevenueStreams {
  subscriptionPaid: number; subscriptionRevenue: number;
  ordersPaid: number; marketplaceGmv: number;
}
export async function revenueStreams(): Promise<RevenueStreams> {
  const db = adminServerClient();
  if (!db) return { subscriptionPaid: 0, subscriptionRevenue: 0, ordersPaid: 0, marketplaceGmv: 0 };
  const [subs, orders] = await Promise.all([
    db.from('payments').select('amount').eq('purpose', 'subscription').eq('status', 'paid'),
    db.from('orders').select('total').in('status', ['paid', 'shipped', 'delivered']),
  ]);
  const subRows = (subs.data ?? []) as { amount: number }[];
  const ordRows = (orders.data ?? []) as { total: number }[];
  return {
    subscriptionPaid: subRows.length,
    subscriptionRevenue: subRows.reduce((s, r) => s + Number(r.amount), 0),
    ordersPaid: ordRows.length,
    marketplaceGmv: ordRows.reduce((s, r) => s + Number(r.total), 0),
  };
}

// Inspektur peran (read-only, service-role)
export function customersList() { return listProfilesByRole(adminServerClient(), 'customer'); }
export function doctorsList() { return listProfilesByRole(adminServerClient(), 'doctor'); }
export function vendorOrgs() { return listOrganizations(adminServerClient(), 'vendor'); }
export function labOrgs() { return listOrganizations(adminServerClient(), 'lab'); }
export function inspectCustomerData(id: string) { return inspectCustomer(adminServerClient(), id); }
export function inspectDoctorData(id: string) { return inspectDoctor(adminServerClient(), id); }
