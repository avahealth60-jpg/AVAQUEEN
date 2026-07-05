// apps/customer/lib/data.ts — baca data customer (RLS: hanya miliknya).
import { createClient } from './supabase/server';
import { getCustomerAuth } from './auth';
import { CONSENT_PURPOSE, WEARABLE_CONSENT_PURPOSE, metricLabel, metricUnit } from './catalog';
import {
  listPrograms,
  summarizeProgress,
  isAutoTracked,
  wellnessNudges,
  effectivePlan,
  type Triage,
  type WellnessProgram,
  type DailyValue,
  type ProgressSummary,
  type AggregateMode,
  type PlanCode,
  type SubscriptionStatus,
} from '@ava/domain';

export async function hasActiveConsent(): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from('consents').select('id')
    .eq('purpose', CONSENT_PURPOSE).eq('status', 'granted').limit(1);
  return (data?.length ?? 0) > 0;
}

export interface ReadingView {
  id: string;
  type: string;
  label: string;
  unit: string;
  display: string;           // nilai siap-tampil
  takenAt: string;
  source: string;
  triage: Triage | null;
  explanation: string | null;
  disclaimer: string | null;
}

function displayValue(type: string, value: Record<string, unknown>): string {
  if (type === 'blood_pressure') return `${value.systolic ?? '?'}/${value.diastolic ?? '?'}`;
  return String(value.value ?? '?');
}

/**
 * Riwayat reading untuk SATU pemilik (default: pengguna sendiri).
 * Sejak Fase C, RLS bisa mengizinkan pendamping membaca reading pasien —
 * karena itu query "milikku" & "milik pasien" HARUS eksplisit per customer_id
 * agar tampilan tidak tercampur.
 */
export async function readingsFor(customerId: string): Promise<ReadingView[]> {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from('health_readings').select('*')
    .eq('customer_id', customerId)
    .order('taken_at', { ascending: false });
  const list = (rows ?? []) as { id: string; reading_type: string; value: Record<string, unknown>; taken_at: string; source: string }[];
  if (list.length === 0) return [];

  const ids = list.map((r) => r.id);
  const { data: an } = await supabase
    .from('analysis_results').select('reading_id, triage, explanation, disclaimer').in('reading_id', ids);
  const byReading = new Map(((an ?? []) as { reading_id: string; triage: Triage; explanation: string | null; disclaimer: string }[])
    .map((a) => [a.reading_id, a]));

  return list.map((r) => {
    const a = byReading.get(r.id);
    return {
      id: r.id,
      type: r.reading_type,
      label: metricLabel(r.reading_type),
      unit: metricUnit(r.reading_type),
      display: displayValue(r.reading_type, r.value),
      takenAt: r.taken_at,
      source: r.source ?? 'manual',
      triage: a?.triage ?? null,
      explanation: a?.explanation ?? null,
      disclaimer: a?.disclaimer ?? null,
    };
  });
}

/** Id pengguna saat ini (untuk memfilter query "milikku" secara eksplisit). */
async function myId(): Promise<string | null> {
  const { userId } = await getCustomerAuth();
  return userId;
}

/** Riwayat reading milik pengguna sendiri. */
export async function readings(): Promise<ReadingView[]> {
  const id = await myId();
  if (!id) return [];
  return readingsFor(id);
}

export interface TrendPoint { takenAt: string; n: number; triage: Triage | null; }
export interface Trend { type: string; label: string; unit: string; points: TrendPoint[]; }

export interface TrendOpts {
  /** Batasi ke reading dengan source ini (mis. selain 'manual' untuk wearable). */
  filter?: (r: ReadingView) => boolean;
}

/** Tren per jenis (untuk sparkline). Hanya metrik tunggal (bukan BP). */
export async function trends(opts: TrendOpts = {}): Promise<Trend[]> {
  const all = await readings();
  const src = opts.filter ? all.filter(opts.filter) : all;
  const map = new Map<string, Trend>();
  for (const r of [...src].reverse()) { // urut lama→baru untuk grafik
    if (r.type === 'blood_pressure') continue;
    const n = Number(r.display);
    if (Number.isNaN(n)) continue;
    if (!map.has(r.type)) map.set(r.type, { type: r.type, label: r.label, unit: r.unit, points: [] });
    map.get(r.type)!.points.push({ takenAt: r.takenAt, n, triage: r.triage });
  }
  return [...map.values()].filter((t) => t.points.length >= 2);
}

// ── Wearable / Smartwatch (Fase A) ───────────────────────────────
export interface WearableConnectionView {
  provider: string;
  status: string;
  connectedAt: string;
  lastSyncAt: string | null;
}

export async function wearableConsentActive(): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from('consents').select('id')
    .eq('purpose', WEARABLE_CONSENT_PURPOSE).eq('status', 'granted').limit(1);
  return (data?.length ?? 0) > 0;
}

export async function wearableConnections(): Promise<WearableConnectionView[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('wearable_connections')
    .select('provider, status, connected_at, last_sync_at')
    .order('connected_at', { ascending: false });
  return ((data ?? []) as { provider: string; status: string; connected_at: string; last_sync_at: string | null }[])
    .map((c) => ({ provider: c.provider, status: c.status, connectedAt: c.connected_at, lastSyncAt: c.last_sync_at }));
}

/** Tren khusus data dari perangkat (source bukan 'manual'). */
export async function wearableTrends(): Promise<Trend[]> {
  return trends({ filter: (r) => r.source !== 'manual' });
}

// ── Wellness (Fase B) ────────────────────────────────────────────
export interface EnrollmentView {
  programCode: string;
  status: string;
  startedAt: string;
  targetDays: number;
}
interface CheckinRow { program_code: string; metric: string; day: string; value: number }

export async function wellnessEnrollments(): Promise<EnrollmentView[]> {
  const id = await myId();
  if (!id) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from('wellness_enrollments')
    .select('program_code, status, started_at, target_days')
    .eq('customer_id', id);
  return ((data ?? []) as { program_code: string; status: string; started_at: string; target_days: number }[])
    .map((e) => ({ programCode: e.program_code, status: e.status, startedAt: e.started_at, targetDays: e.target_days }));
}

async function wellnessCheckins(): Promise<CheckinRow[]> {
  const id = await myId();
  if (!id) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from('wellness_checkins').select('program_code, metric, day, value')
    .eq('customer_id', id);
  return (data ?? []) as CheckinRow[];
}

/** Deret nilai harian sebuah program (dari reading otomatis atau check-in). */
function dailyValuesFor(
  program: WellnessProgram,
  allReadings: ReadingView[],
  checkins: CheckinRow[],
): DailyValue[] {
  if (isAutoTracked(program.metric)) {
    return allReadings
      .filter((r) => r.type === program.metric)
      .map((r) => ({ date: String(r.takenAt).slice(0, 10), value: Number(r.display) }))
      .filter((d) => !Number.isNaN(d.value));
  }
  return checkins
    .filter((c) => c.program_code === program.code)
    .map((c) => ({ date: String(c.day).slice(0, 10), value: Number(c.value) }))
    .filter((d) => !Number.isNaN(d.value));
}

export interface ProgramCard {
  program: WellnessProgram;
  enrolled: boolean;
  status: string | null;
  summary: ProgressSummary | null;
  /** Total check-in hari ini (untuk metrik manual seperti hidrasi). */
  todayCheckin: number | null;
}

export async function wellnessDashboard(): Promise<ProgramCard[]> {
  const [enr, allReadings, checkins] = await Promise.all([
    wellnessEnrollments(), readings(), wellnessCheckins(),
  ]);
  const byCode = new Map(enr.map((e) => [e.programCode, e]));
  const today = new Date().toISOString().slice(0, 10);

  return listPrograms().map((program) => {
    const e = byCode.get(program.code) ?? null;
    const active = !!e && e.status === 'active';
    let summary: ProgressSummary | null = null;
    let todayCheckin: number | null = null;
    if (active) {
      const daily = dailyValuesFor(program, allReadings, checkins);
      const mode: AggregateMode = program.metric === 'sleep_minutes' ? 'max' : 'sum';
      summary = summarizeProgress(program.metric, program.dailyTarget, daily, mode);
      if (!isAutoTracked(program.metric)) {
        todayCheckin = checkins
          .filter((c) => c.program_code === program.code && String(c.day).slice(0, 10) === today)
          .reduce((s, c) => s + Number(c.value), 0);
      }
    }
    return { program, enrolled: active, status: e?.status ?? null, summary, todayCheckin };
  });
}

// ── Pendamping / Caregiver (Fase C) ──────────────────────────────
export interface CaregiverLinkView {
  id: string;
  patientId: string;
  caregiverId: string | null;
  status: string;
  scopes: string[];
  inviteToken: string;
  invitedAt: string;
}

/** Tautan di mana AKU adalah pasien (orang yang aku beri akses). */
export async function linksAsPatient(): Promise<CaregiverLinkView[]> {
  const id = await myId();
  if (!id) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from('caregiver_links')
    .select('id, patient_id, caregiver_id, status, scopes, invite_token, invited_at')
    .eq('patient_id', id)
    .order('invited_at', { ascending: false });
  return ((data ?? []) as any[]).map((l) => ({
    id: l.id, patientId: l.patient_id, caregiverId: l.caregiver_id,
    status: l.status, scopes: l.scopes ?? [], inviteToken: l.invite_token, invitedAt: l.invited_at,
  }));
}

/** Tautan di mana AKU adalah pendamping (orang yang aku dampingi). */
export async function linksAsCaregiver(): Promise<CaregiverLinkView[]> {
  const id = await myId();
  if (!id) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from('caregiver_links')
    .select('id, patient_id, caregiver_id, status, scopes, invite_token, invited_at')
    .eq('caregiver_id', id).eq('status', 'active')
    .order('invited_at', { ascending: false });
  return ((data ?? []) as any[]).map((l) => ({
    id: l.id, patientId: l.patient_id, caregiverId: l.caregiver_id,
    status: l.status, scopes: l.scopes ?? [], inviteToken: l.invite_token, invitedAt: l.invited_at,
  }));
}

/** Ringkasan singkat reading pasien (RLS menegakkan hak akses pendamping). */
export async function patientReadings(patientId: string): Promise<ReadingView[]> {
  return readingsFor(patientId);
}

// ── Notifikasi (Fase C) ──────────────────────────────────────────
export interface NotificationView {
  id: string;
  title: string;
  body: string;
  channel: string;
  readAt: string | null;
  createdAt: string;
}

export async function notifications(): Promise<NotificationView[]> {
  const id = await myId();
  if (!id) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from('notifications')
    .select('id, title, body, channel, read_at, created_at')
    .eq('recipient_id', id)
    .order('created_at', { ascending: false })
    .limit(50);
  return ((data ?? []) as any[]).map((n) => ({
    id: n.id, title: n.title, body: n.body, channel: n.channel,
    readAt: n.read_at, createdAt: n.created_at,
  }));
}

export async function unreadCount(): Promise<number> {
  const id = await myId();
  if (!id) return 0;
  const supabase = createClient();
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', id).is('read_at', null);
  return count ?? 0;
}

// ── Billing / Langganan (Fase C) ─────────────────────────────────
export interface SubscriptionView {
  plan: PlanCode;
  status: SubscriptionStatus;
  expiresAt: string | null;
}
export interface BillingSummary {
  /** Paket efektif (premium hanya bila langganan valid), default 'free'. */
  effective: PlanCode;
  subscription: SubscriptionView | null;
}

export async function billingSummary(): Promise<BillingSummary> {
  const id = await myId();
  if (!id) return { effective: 'free', subscription: null };
  const supabase = createClient();
  const { data } = await supabase
    .from('subscriptions').select('plan, status, expires_at')
    .eq('customer_id', id).maybeSingle();
  if (!data) return { effective: 'free', subscription: null };
  const sub: SubscriptionView = {
    plan: data.plan as PlanCode,
    status: data.status as SubscriptionStatus,
    expiresAt: data.expires_at,
  };
  return { effective: effectivePlan(sub.status, sub.plan, sub.expiresAt), subscription: sub };
}

// ── Wellness korporat / B2B (Fase lanjut) ────────────────────────
export interface EmployerMembershipView {
  employerId: string;
  employerName: string | null;
  status: string;
  joinedAt: string;
}

export async function myEmployers(): Promise<EmployerMembershipView[]> {
  const id = await myId();
  if (!id) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from('employer_enrollments')
    .select('employer_id, status, joined_at, organizations(name)')
    .eq('customer_id', id).eq('status', 'active')
    .order('joined_at', { ascending: false });
  return ((data ?? []) as any[]).map((e) => {
    const org = Array.isArray(e.organizations) ? e.organizations[0] : e.organizations;
    return { employerId: e.employer_id, employerName: org?.name ?? null, status: e.status, joinedAt: e.joined_at };
  });
}

/** Nudge wellness "hidup" (dihitung, tidak disimpan) dari program aktif. */
export async function liveWellnessNudges() {
  const cards = await wellnessDashboard();
  const inputs = cards
    .filter((c) => c.enrolled && c.summary)
    .map((c) => ({
      title: c.program.title,
      unit: c.program.unit,
      target: c.program.dailyTarget,
      latest: c.summary!.latest,
      status: c.summary!.status,
      streak: c.summary!.streak,
    }));
  return wellnessNudges(inputs, 3);
}
