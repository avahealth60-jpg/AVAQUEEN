// packages/db/src/queries.ts
// Query bertipe untuk konsol AVA Admin. Mengembalikan bentuk data siap-pakai
// (sudah digabung), bukan baris mentah. Aman dipanggil walau env belum diset:
// klien null → mengembalikan kosong/zero, halaman tampil rapi.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Device, DeviceModel, Organization, Calibration, QcResultRow, Badge,
  Profile, Consent, AuditLog,
} from './types';
import type { QcResult } from '@ava/domain';

// ── Bentuk gabungan untuk UI ─────────────────────────────────────
export interface FleetRow {
  deviceId: string;
  serial: string;
  status: string;
  vendorId: string;
  vendorName: string;
  modelName: string;
  category: string | null;
  intervalMonths: number;
  /** kalibrasi terakhir (jika ada) */
  lastCalibrationId: string | null;
  performedAt: string | null;   // YYYY-MM-DD
  nextDueAt: string | null;     // YYYY-MM-DD
  qc: QcResult | null;
  badgeExpiresAt: string | null;
  certificateUrl: string | null;
}

export interface PartnerRow {
  id: string;
  name: string;
  kind: Organization['kind'];
  memberCount: number;
  deviceCount: number;       // relevan utk vendor
  calibrationCount: number;  // relevan utk lab
  createdAt: string;
}

export interface DashboardStats {
  devices: number;
  activeBadges: number;
  overdueCalibrations: number;
  dueSoonCalibrations: number;
  vendors: number;
  labs: number;
  faskes: number;
  customers: number;
}

// ── Helper ───────────────────────────────────────────────────────
function latestByDate<T>(rows: T[], pick: (r: T) => string): T | null {
  if (rows.length === 0) return null;
  return rows.reduce((a, b) => (pick(a) >= pick(b) ? a : b));
}

// ── Armada (wedge) ───────────────────────────────────────────────
export async function getFleet(db: SupabaseClient | null): Promise<FleetRow[]> {
  if (!db) return [];
  const [devicesRes, modelsRes, orgsRes, calsRes, qcsRes, badgesRes] = await Promise.all([
    db.from('devices').select('*'),
    db.from('device_models').select('*'),
    db.from('organizations').select('*'),
    db.from('calibrations').select('*'),
    db.from('qc_results').select('*'),
    db.from('badges').select('*'),
  ]);

  const devices = (devicesRes.data ?? []) as Device[];
  const models = new Map((modelsRes.data ?? []).map((m: DeviceModel) => [m.id, m]));
  const orgs = new Map((orgsRes.data ?? []).map((o: Organization) => [o.id, o]));
  const cals = (calsRes.data ?? []) as Calibration[];
  const qcs = (qcsRes.data ?? []) as QcResultRow[];
  const badges = (badgesRes.data ?? []) as Badge[];

  const qcByCal = new Map<string, QcResultRow>();
  for (const q of qcs) {
    const prev = qcByCal.get(q.calibration_id);
    if (!prev || q.created_at >= prev.created_at) qcByCal.set(q.calibration_id, q);
  }

  return devices.map((d) => {
    const model = models.get(d.model_id);
    const vendor = orgs.get(d.vendor_id);
    const deviceCals = cals.filter((c) => c.device_id === d.id);
    const lastCal = latestByDate(deviceCals, (c) => c.performed_at);
    const qc = lastCal ? (qcByCal.get(lastCal.id)?.result ?? null) : null;
    const deviceBadges = badges.filter((b) => b.device_id === d.id);
    const lastBadge = latestByDate(deviceBadges, (b) => b.expires_at);

    return {
      deviceId: d.id,
      serial: d.serial,
      status: d.status,
      vendorId: d.vendor_id,
      vendorName: vendor?.name ?? '—',
      modelName: model?.name ?? '—',
      category: model?.category ?? null,
      intervalMonths: model?.calibration_interval_months ?? 12,
      lastCalibrationId: lastCal?.id ?? null,
      performedAt: lastCal?.performed_at ?? null,
      nextDueAt: lastCal?.next_due_at ?? null,
      qc,
      badgeExpiresAt: lastBadge?.expires_at ?? null,
      certificateUrl: lastCal?.certificate_url ?? null,
    };
  });
}

// ── Mitra ────────────────────────────────────────────────────────
export async function getPartners(db: SupabaseClient | null): Promise<PartnerRow[]> {
  if (!db) return [];
  const [orgsRes, membersRes, devicesRes, calsRes] = await Promise.all([
    db.from('organizations').select('*'),
    db.from('organization_members').select('organization_id'),
    db.from('devices').select('vendor_id'),
    db.from('calibrations').select('lab_id'),
  ]);
  const members = (membersRes.data ?? []) as { organization_id: string }[];
  const devices = (devicesRes.data ?? []) as { vendor_id: string }[];
  const cals = (calsRes.data ?? []) as { lab_id: string }[];

  const count = (arr: { [k: string]: string }[], key: string, id: string) =>
    arr.filter((r) => r[key] === id).length;

  return ((orgsRes.data ?? []) as Organization[]).map((o) => ({
    id: o.id,
    name: o.name,
    kind: o.kind,
    memberCount: count(members, 'organization_id', o.id),
    deviceCount: count(devices, 'vendor_id', o.id),
    calibrationCount: count(cals, 'lab_id', o.id),
    createdAt: o.created_at,
  }));
}

// ── Statistik dashboard ──────────────────────────────────────────
export async function getDashboardStats(
  db: SupabaseClient | null,
  now: Date = new Date(),
): Promise<DashboardStats> {
  const empty: DashboardStats = {
    devices: 0, activeBadges: 0, overdueCalibrations: 0, dueSoonCalibrations: 0,
    vendors: 0, labs: 0, faskes: 0, customers: 0,
  };
  if (!db) return empty;

  const fleet = await getFleet(db);
  const [orgsRes, profilesRes] = await Promise.all([
    db.from('organizations').select('kind'),
    db.from('profiles').select('role'),
  ]);
  const orgs = (orgsRes.data ?? []) as { kind: string }[];
  const profiles = (profilesRes.data ?? []) as { role: string }[];

  const today = now.toISOString().slice(0, 10);
  const soon = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);

  return {
    devices: fleet.length,
    activeBadges: fleet.filter((f) => f.badgeExpiresAt && f.badgeExpiresAt >= today).length,
    overdueCalibrations: fleet.filter((f) => f.nextDueAt && f.nextDueAt < today).length,
    dueSoonCalibrations: fleet.filter(
      (f) => f.nextDueAt && f.nextDueAt >= today && f.nextDueAt <= soon,
    ).length,
    vendors: orgs.filter((o) => o.kind === 'vendor').length,
    labs: orgs.filter((o) => o.kind === 'lab').length,
    faskes: orgs.filter((o) => o.kind === 'faskes').length,
    customers: profiles.filter((p) => p.role === 'customer').length,
  };
}

// ── Kepatuhan ────────────────────────────────────────────────────
export interface ConsentRow extends Consent { customerName: string | null; }

export async function getConsents(db: SupabaseClient | null): Promise<ConsentRow[]> {
  if (!db) return [];
  const [consentsRes, profilesRes] = await Promise.all([
    db.from('consents').select('*').order('granted_at', { ascending: false }),
    db.from('profiles').select('id, full_name'),
  ]);
  const names = new Map(
    ((profilesRes.data ?? []) as Pick<Profile, 'id' | 'full_name'>[]).map((p) => [p.id, p.full_name]),
  );
  return ((consentsRes.data ?? []) as Consent[]).map((c) => ({
    ...c,
    customerName: names.get(c.customer_id) ?? null,
  }));
}

export async function getAuditLogs(
  db: SupabaseClient | null,
  limit = 50,
): Promise<AuditLog[]> {
  if (!db) return [];
  const res = await db
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (res.data ?? []) as AuditLog[];
}

// ── Komisi konsultasi (pendapatan AVA kedua) ────────────────────
export interface CommissionStats { count: number; gross: number; avaRevenue: number; }
export async function getCommissionStats(db: SupabaseClient | null): Promise<CommissionStats> {
  if (!db) return { count: 0, gross: 0, avaRevenue: 0 };
  const { data } = await db.from('commissions').select('gross_amount, commission_amount');
  const rows = (data ?? []) as { gross_amount: number; commission_amount: number }[];
  return {
    count: rows.length,
    gross: rows.reduce((s, r) => s + Number(r.gross_amount), 0),
    avaRevenue: rows.reduce((s, r) => s + Number(r.commission_amount), 0),
  };
}

// ── Inspektur peran (superadmin "lihat sebagai") — service-role, read-only ──
export interface NamedRow { id: string; name: string; }

export async function listProfilesByRole(db: SupabaseClient | null, role: string): Promise<NamedRow[]> {
  if (!db) return [];
  const { data } = await db.from('profiles').select('id, full_name').eq('role', role).order('full_name');
  return ((data ?? []) as { id: string; full_name: string | null }[]).map((p) => ({ id: p.id, name: p.full_name ?? '(tanpa nama)' }));
}

export async function listOrganizations(db: SupabaseClient | null, kind: string): Promise<NamedRow[]> {
  if (!db) return [];
  const { data } = await db.from('organizations').select('id, name').eq('kind', kind).order('name');
  return ((data ?? []) as { id: string; name: string }[]).map((o) => ({ id: o.id, name: o.name }));
}

export interface InspectReading { type: string; display: string; takenAt: string; triage: string | null; }
export interface InspectConsult { id: string; counterpart: string; status: string; fee: number; shared: InspectReading[]; }

const READ_LABEL: Record<string, string> = {
  glucose_fasting: 'Gula darah puasa', spo2: 'SpO₂', heart_rate: 'Detak jantung',
  temperature: 'Suhu', blood_pressure: 'Tekanan darah',
};
const readDisplay = (t: string, v: Record<string, unknown>) =>
  t === 'blood_pressure' ? `${v.systolic}/${v.diastolic}` : String(v.value ?? '');

export async function inspectCustomer(db: SupabaseClient | null, customerId: string) {
  if (!db || !customerId) return { readings: [] as InspectReading[], consults: [] as InspectConsult[] };
  const [rd, cs] = await Promise.all([
    db.from('health_readings').select('id, reading_type, value, taken_at').eq('customer_id', customerId).order('taken_at', { ascending: false }),
    db.from('consultations').select('id, doctor_id, status, fee').eq('customer_id', customerId).order('created_at', { ascending: false }),
  ]);
  const rows = (rd.data ?? []) as { id: string; reading_type: string; value: Record<string, unknown>; taken_at: string }[];
  const anIds = rows.map((r) => r.id);
  const triage = new Map<string, string>();
  if (anIds.length) {
    const { data: an } = await db.from('analysis_results').select('reading_id, triage').in('reading_id', anIds);
    ((an ?? []) as { reading_id: string; triage: string }[]).forEach((a) => triage.set(a.reading_id, a.triage));
  }
  const docIds = [...new Set(((cs.data ?? []) as { doctor_id: string }[]).map((c) => c.doctor_id))];
  const docNames = new Map<string, string>();
  if (docIds.length) {
    const { data: docs } = await db.from('profiles').select('id, full_name').in('id', docIds);
    ((docs ?? []) as { id: string; full_name: string | null }[]).forEach((d) => docNames.set(d.id, d.full_name ?? 'Dokter'));
  }
  return {
    readings: rows.map((r) => ({ type: READ_LABEL[r.reading_type] ?? r.reading_type, display: readDisplay(r.reading_type, r.value), takenAt: r.taken_at, triage: triage.get(r.id) ?? null })),
    consults: ((cs.data ?? []) as { id: string; doctor_id: string; status: string; fee: number }[]).map((c) => ({ id: c.id, counterpart: docNames.get(c.doctor_id) ?? 'Dokter', status: c.status, fee: c.fee, shared: [] })),
  };
}

export async function inspectDoctor(db: SupabaseClient | null, doctorId: string): Promise<InspectConsult[]> {
  if (!db || !doctorId) return [];
  const { data: cs } = await db.from('consultations')
    .select('id, customer_id, status, fee, shared_reading_ids').eq('doctor_id', doctorId).order('created_at', { ascending: false });
  const rows = (cs ?? []) as { id: string; customer_id: string; status: string; fee: number; shared_reading_ids: string[] }[];
  const patIds = [...new Set(rows.map((r) => r.customer_id))];
  const names = new Map<string, string>();
  if (patIds.length) {
    const { data: p } = await db.from('profiles').select('id, full_name').in('id', patIds);
    ((p ?? []) as { id: string; full_name: string | null }[]).forEach((x) => names.set(x.id, x.full_name ?? 'Pasien'));
  }
  const allShared = [...new Set(rows.flatMap((r) => r.shared_reading_ids ?? []))];
  const rmap = new Map<string, { type: string; display: string }>();
  const tmap = new Map<string, string>();
  if (allShared.length) {
    const { data: rd } = await db.from('health_readings').select('id, reading_type, value').in('id', allShared);
    ((rd ?? []) as { id: string; reading_type: string; value: Record<string, unknown> }[]).forEach((r) => rmap.set(r.id, { type: READ_LABEL[r.reading_type] ?? r.reading_type, display: readDisplay(r.reading_type, r.value) }));
    const { data: an } = await db.from('analysis_results').select('reading_id, triage').in('reading_id', allShared);
    ((an ?? []) as { reading_id: string; triage: string }[]).forEach((a) => tmap.set(a.reading_id, a.triage));
  }
  return rows.map((r) => ({
    id: r.id, counterpart: names.get(r.customer_id) ?? 'Pasien', status: r.status, fee: r.fee,
    shared: (r.shared_reading_ids ?? []).map((id) => ({ type: rmap.get(id)?.type ?? '—', display: rmap.get(id)?.display ?? '', takenAt: '', triage: tmap.get(id) ?? null })),
  }));
}
