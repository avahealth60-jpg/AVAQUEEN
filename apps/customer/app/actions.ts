// apps/customer/app/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../lib/supabase/server';
import { getCustomerAuth } from '../lib/auth';
import { CONSENT_PURPOSE, WEARABLE_CONSENT_PURPOSE } from '../lib/catalog';
import { knowledgeFor } from '../lib/data';
import {
  analyzeReading,
  normalizeWearableBatch,
  getProgram,
  sanitizeScopes,
  getPlan,
  priceConsultation,
  effectivePlan,
  computeOrderTotal,
  EDUCATIONAL_DISCLAIMER,
  type ReadingInput,
  type Triage,
  type WearableSample,
  type WearableSource,
  type PlanCode,
  type SubscriptionStatus,
} from '@ava/domain';
import { activeProvider } from '../lib/payment/provider';

/** Tarif dasar konsultasi (harus sama dgn default kolom consultations.fee). */
const BASE_CONSULT_FEE = 50000;

/** Paket efektif pengguna saat ini (untuk harga sadar-langganan). */
async function currentPlan(
  supabase: ReturnType<typeof createClient>,
): Promise<PlanCode> {
  const { data } = await supabase
    .from('subscriptions').select('plan, status, expires_at').maybeSingle();
  if (!data) return 'free';
  return effectivePlan(data.status as SubscriptionStatus, data.plan as PlanCode, data.expires_at);
}

export interface ConsentResult { ok: boolean; message: string; }

export async function grantConsent(): Promise<ConsentResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  const supabase = createClient();
  const { error } = await supabase.from('consents').insert({
    customer_id: userId, purpose: CONSENT_PURPOSE, status: 'granted',
  });
  if (error) return { ok: false, message: `Gagal menyimpan persetujuan: ${error.message}` };
  revalidatePath('/');
  return { ok: true, message: 'Persetujuan tercatat.' };
}

export async function withdrawConsent(): Promise<ConsentResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  const supabase = createClient();
  const { error } = await supabase
    .from('consents')
    .update({ status: 'withdrawn', withdrawn_at: new Date().toISOString() })
    .eq('customer_id', userId).eq('purpose', CONSENT_PURPOSE).eq('status', 'granted');
  if (error) return { ok: false, message: `Gagal menarik persetujuan: ${error.message}` };
  revalidatePath('/');
  return { ok: true, message: 'Persetujuan ditarik. Data lama tetap milikmu dan bisa dihapus.' };
}

export interface SubmitResult {
  ok: boolean;
  message: string;
  triage?: Triage;
  explanation?: string;
  disclaimer?: string;
  suggestConsultation?: boolean;
  readingId?: string;
  // Evaluasi komprehensif dari basis pengetahuan terkurasi (bila tersedia).
  artinya?: string;
  penyebab?: string;
  saran?: string;
  kapanKeDokter?: string;
}

export async function submitReading(
  _prev: SubmitResult | null,
  formData: FormData,
): Promise<SubmitResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };

  // Consent-first (UU PDP): proses data kesehatan hanya bila ada consent aktif.
  const supabase = createClient();
  const { data: consent } = await supabase
    .from('consents').select('id')
    .eq('purpose', CONSENT_PURPOSE).eq('status', 'granted').limit(1);
  if (!consent || consent.length === 0) {
    return { ok: false, message: 'Berikan persetujuan pemrosesan data dulu.' };
  }

  const type = String(formData.get('type') ?? '').trim();
  let value: Record<string, number>;
  let analysisInput: ReadingInput;

  if (type === 'blood_pressure') {
    const sys = Number(formData.get('systolic'));
    const dia = Number(formData.get('diastolic'));
    if (!Number.isFinite(sys) || !Number.isFinite(dia)) return { ok: false, message: 'Isi sistolik & diastolik.' };
    value = { systolic: sys, diastolic: dia };
    analysisInput = { type: 'blood_pressure', systolic: sys, diastolic: dia };
  } else {
    const n = Number(formData.get('value'));
    if (!Number.isFinite(n)) return { ok: false, message: 'Isi nilai pemeriksaan.' };
    value = { value: n };
    // type sudah dibatasi oleh pilihan UI; cast aman.
    analysisInput = { type: type as Exclude<ReadingInput['type'], 'blood_pressure'>, value: n };
  }

  // 1) Simpan reading.
  const { data: reading, error: rErr } = await supabase
    .from('health_readings')
    .insert({ customer_id: userId, reading_type: type, value, source: 'manual' })
    .select('id').single();
  if (rErr || !reading) return { ok: false, message: `Gagal menyimpan hasil: ${rErr?.message ?? ''}` };

  // 2) Analisis deterministik (triase + edukasi). LLM dapat memperhalus nanti.
  const draft = analyzeReading(analysisInput);

  // 3) Simpan analisis (is_educational + disclaimer dikunci skema).
  const { error: aErr } = await supabase.from('analysis_results').insert({
    reading_id: reading.id,
    triage: draft.triage,
    explanation: draft.explanation,
    disclaimer: draft.disclaimer,
  });
  if (aErr) return { ok: false, message: `Hasil tersimpan, analisis gagal: ${aErr.message}` };

  // Evaluasi komprehensif dari basis pengetahuan terkurasi (bila ada).
  const knowledge = await knowledgeFor(type, draft.triage);

  revalidatePath('/');
  return {
    ok: true,
    message: 'Hasil tersimpan.',
    triage: draft.triage,
    explanation: draft.explanation,
    disclaimer: draft.disclaimer,
    suggestConsultation: draft.suggest_consultation,
    readingId: reading.id,
    artinya: knowledge?.artinya,
    penyebab: knowledge?.penyebab ?? undefined,
    saran: knowledge?.saran ?? undefined,
    kapanKeDokter: knowledge?.kapanKeDokter ?? undefined,
  };
}

// ── Catat aktivitas manual (C3) ──────────────────────────────────
export interface ActivityLogResult { ok: boolean; message: string; }
const ACTIVITY_UNIT: Record<string, string> = {
  steps: 'langkah', sleep_minutes: 'menit', active_minutes: 'menit',
};

/** Catat aktivitas gaya hidup manual (langkah/tidur/menit aktif) → memberi
 *  makan program wellness, tanpa perlu wearable. Metrik gaya hidup TIDAK ditriase. */
export async function logActivity(metric: string, value: number): Promise<ActivityLogResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  if (!ACTIVITY_UNIT[metric]) return { ok: false, message: 'Metrik tidak dikenal.' };
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return { ok: false, message: 'Isi angka yang valid.' };

  const supabase = createClient();
  const { data: consent } = await supabase
    .from('consents').select('id').eq('purpose', CONSENT_PURPOSE).eq('status', 'granted').limit(1);
  if (!consent || consent.length === 0) return { ok: false, message: 'Berikan persetujuan pemrosesan data dulu.' };

  const { error } = await supabase.from('health_readings').insert({
    customer_id: userId, reading_type: metric,
    value: { value: n, kind: 'lifestyle' }, unit: ACTIVITY_UNIT[metric], source: 'manual',
  });
  if (error) return { ok: false, message: `Gagal mencatat: ${error.message}` };
  revalidatePath('/perangkat');
  revalidatePath('/wellness');
  return { ok: true, message: 'Aktivitas tercatat.' };
}

// ── Panel multi-parameter (A4) ───────────────────────────────────
export interface PanelItem { label: string; value: string; triage: Triage; }
export interface PanelResult {
  ok: boolean; message: string; items?: PanelItem[]; worst?: Triage; suggestConsultation?: boolean;
}

const PANEL_SINGLE: { key: 'glucose_fasting' | 'spo2' | 'heart_rate' | 'temperature'; label: string; unit: string }[] = [
  { key: 'glucose_fasting', label: 'Gula darah puasa', unit: 'mg/dL' },
  { key: 'spo2', label: 'SpO₂', unit: '%' },
  { key: 'heart_rate', label: 'Detak jantung', unit: 'bpm' },
  { key: 'temperature', label: 'Suhu tubuh', unit: '°C' },
];
const TRIAGE_RANK: Record<Triage, number> = { normal: 0, perhatian: 1, segera: 2 };

/** Catat banyak parameter sekaligus → banyak reading + analisis, satu ringkasan. */
export async function submitPanel(_prev: PanelResult | null, formData: FormData): Promise<PanelResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  const supabase = createClient();

  const { data: consent } = await supabase
    .from('consents').select('id').eq('purpose', CONSENT_PURPOSE).eq('status', 'granted').limit(1);
  if (!consent || consent.length === 0) return { ok: false, message: 'Berikan persetujuan pemrosesan data dulu.' };

  const items: PanelItem[] = [];
  let worst: Triage = 'normal';

  async function record(type: string, value: Record<string, number>, input: ReadingInput, label: string, shown: string) {
    const { data: reading, error: rErr } = await supabase
      .from('health_readings').insert({ customer_id: userId, reading_type: type, value, source: 'manual' })
      .select('id').single();
    if (rErr || !reading) throw new Error(rErr?.message ?? 'gagal simpan');
    const draft = analyzeReading(input);
    await supabase.from('analysis_results').insert({
      reading_id: reading.id, triage: draft.triage, explanation: draft.explanation, disclaimer: draft.disclaimer,
    });
    items.push({ label: `${label}: ${shown}`, value: shown, triage: draft.triage });
    if (TRIAGE_RANK[draft.triage] > TRIAGE_RANK[worst]) worst = draft.triage;
  }

  try {
    for (const m of PANEL_SINGLE) {
      const raw = String(formData.get(m.key) ?? '').trim();
      if (!raw) continue;
      const n = Number(raw);
      if (!Number.isFinite(n)) continue;
      await record(m.key, { value: n }, { type: m.key, value: n }, m.label, `${n} ${m.unit}`);
    }
    const sys = Number(formData.get('systolic'));
    const dia = Number(formData.get('diastolic'));
    if (Number.isFinite(sys) && Number.isFinite(dia)) {
      await record('blood_pressure', { systolic: sys, diastolic: dia },
        { type: 'blood_pressure', systolic: sys, diastolic: dia }, 'Tekanan darah', `${sys}/${dia} mmHg`);
    }
  } catch (e) {
    return { ok: false, message: `Sebagian gagal disimpan: ${e instanceof Error ? e.message : String(e)}` };
  }

  if (items.length === 0) return { ok: false, message: 'Isi minimal satu parameter.' };
  revalidatePath('/');
  revalidatePath('/riwayat');
  return {
    ok: true,
    message: `${items.length} parameter tersimpan.`,
    items, worst, suggestConsultation: worst !== 'normal',
  };
}

// ── Wearable / Smartwatch (Fase A) ───────────────────────────────
export interface WearableResult { ok: boolean; message: string; }

/**
 * Tautkan sumber wearable: catat consent 'wearable_sync' (bila belum) +
 * baris koneksi aktif. Data biometrik = sensitif → consent WAJIB dulu.
 */
export async function connectWearable(provider: WearableSource): Promise<WearableResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  const supabase = createClient();

  // Consent wearable_sync (idempoten: hanya buat bila belum ada yang granted).
  const { data: existing } = await supabase
    .from('consents').select('id')
    .eq('purpose', WEARABLE_CONSENT_PURPOSE).eq('status', 'granted').limit(1);
  if (!existing || existing.length === 0) {
    const { error: cErr } = await supabase.from('consents').insert({
      customer_id: userId, purpose: WEARABLE_CONSENT_PURPOSE, status: 'granted',
    });
    if (cErr) return { ok: false, message: `Gagal menyimpan persetujuan: ${cErr.message}` };
  }

  // Koneksi (unik per customer+provider) — aktifkan / aktifkan kembali.
  const { error: connErr } = await supabase
    .from('wearable_connections')
    .upsert(
      { customer_id: userId, provider, status: 'active', revoked_at: null, connected_at: new Date().toISOString() },
      { onConflict: 'customer_id,provider' },
    );
  if (connErr) return { ok: false, message: `Gagal menautkan perangkat: ${connErr.message}` };

  revalidatePath('/perangkat');
  return { ok: true, message: 'Perangkat tertaut.' };
}

export async function disconnectWearable(provider: WearableSource): Promise<WearableResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  const supabase = createClient();
  const { error } = await supabase
    .from('wearable_connections')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('customer_id', userId).eq('provider', provider);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/perangkat');
  return { ok: true, message: 'Perangkat dilepas. Data lama tetap milikmu.' };
}

export interface SyncInputSample {
  metric: string;
  value: number;
  unit?: string | null;
  takenAt: string;
  deviceModel?: string | null;
}
export interface SyncResult extends WearableResult {
  stored?: number;
  skipped?: number;
  flagged?: number; // metrik klinis non-normal
}

/**
 * Terima sampel dari jembatan klien, normalisasi via @ava/domain (deterministik),
 * simpan ke health_readings. Metrik KLINIS bertriase → analysis_results.
 * Metrik gaya hidup TIDAK ditriase (invarian non-SaMD dijaga di domain).
 */
export async function syncWearableSamples(
  provider: WearableSource,
  samples: SyncInputSample[],
): Promise<SyncResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  if (!Array.isArray(samples) || samples.length === 0) {
    return { ok: false, message: 'Tidak ada data untuk disinkronkan.' };
  }
  const supabase = createClient();

  // Consent-gate wearable_sync (UU PDP).
  const { data: consent } = await supabase
    .from('consents').select('id')
    .eq('purpose', WEARABLE_CONSENT_PURPOSE).eq('status', 'granted').limit(1);
  if (!consent || consent.length === 0) {
    return { ok: false, message: 'Tautkan perangkat (beri persetujuan) dulu.' };
  }

  const input: WearableSample[] = samples.map((s) => ({
    metric: s.metric,
    value: s.value,
    unit: s.unit ?? null,
    takenAt: s.takenAt,
    source: provider,
    deviceModel: s.deviceModel ?? null,
  }));
  const normalized = normalizeWearableBatch(input);
  const skipped = samples.length - normalized.length;

  let stored = 0;
  let flagged = 0;
  for (const n of normalized) {
    const { data: reading, error: rErr } = await supabase
      .from('health_readings')
      .insert({
        customer_id: userId,
        reading_type: n.readingType,
        value: { value: n.value, kind: n.kind, device_model: n.deviceModel },
        unit: n.unit,
        taken_at: n.takenAt,
        source: provider,
      })
      .select('id').single();
    if (rErr || !reading) return { ok: false, message: `Gagal menyimpan data: ${rErr?.message ?? ''}` };
    stored++;

    // Hanya metrik klinis bertriase yang dianalisis (invarian non-SaMD).
    if (n.kind === 'clinical' && n.triage) {
      if (n.triage !== 'normal') flagged++;
      const { error: aErr } = await supabase.from('analysis_results').insert({
        reading_id: reading.id,
        triage: n.triage,
        explanation: `Hasil ${n.label} dari perangkat (${n.value}${n.unit ?? ''}): ${n.reason}`,
        disclaimer: EDUCATIONAL_DISCLAIMER,
      });
      if (aErr) return { ok: false, message: `Data tersimpan, analisis gagal: ${aErr.message}` };
    }
  }

  await supabase
    .from('wearable_connections')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('customer_id', userId).eq('provider', provider);

  revalidatePath('/perangkat');
  revalidatePath('/');
  return {
    ok: true,
    message: `Sinkron selesai: ${stored} data tersimpan${skipped ? `, ${skipped} dilewati` : ''}.`,
    stored, skipped, flagged,
  };
}

// ── Wellness (Fase B) ────────────────────────────────────────────
export interface WellnessActionResult { ok: boolean; message: string; }

export async function enrollWellness(programCode: string): Promise<WellnessActionResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  const program = getProgram(programCode);
  if (!program) return { ok: false, message: 'Program tidak dikenal.' };

  const supabase = createClient();
  const { error } = await supabase
    .from('wellness_enrollments')
    .upsert(
      { customer_id: userId, program_code: programCode, status: 'active', target_days: program.durationDays },
      { onConflict: 'customer_id,program_code' },
    );
  if (error) return { ok: false, message: `Gagal mengikuti program: ${error.message}` };
  revalidatePath('/wellness');
  return { ok: true, message: `Kamu mengikuti "${program.title}".` };
}

export async function leaveWellness(programCode: string): Promise<WellnessActionResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  const supabase = createClient();
  const { error } = await supabase
    .from('wellness_enrollments')
    .update({ status: 'left' })
    .eq('customer_id', userId).eq('program_code', programCode);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/wellness');
  return { ok: true, message: 'Kamu berhenti dari program. Riwayatmu tetap tersimpan.' };
}

/** Catat kemajuan harian untuk metrik manual (mis. hidrasi). Menambah ke hari ini. */
export async function checkinWellness(
  programCode: string,
  amount: number,
): Promise<WellnessActionResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  const program = getProgram(programCode);
  if (!program) return { ok: false, message: 'Program tidak dikenal.' };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, message: 'Isi jumlah yang valid.' };

  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  // Akumulasi ke nilai hari ini (unik per customer+program+day).
  const { data: existing } = await supabase
    .from('wellness_checkins').select('id, value')
    .eq('program_code', programCode).eq('day', today).limit(1).maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('wellness_checkins')
      .update({ value: Number(existing.value) + amount })
      .eq('id', existing.id);
    if (error) return { ok: false, message: error.message };
  } else {
    const { error } = await supabase.from('wellness_checkins').insert({
      customer_id: userId, program_code: programCode, day: today,
      metric: program.metric, value: amount,
    });
    if (error) return { ok: false, message: error.message };
  }
  revalidatePath('/wellness');
  return { ok: true, message: 'Tercatat. Terus jaga kebiasaan baikmu!' };
}

// ── Pendamping / Caregiver (Fase C) ──────────────────────────────
export interface CaregiverActionResult { ok: boolean; message: string; token?: string; }

/** Pasien membuat undangan pendamping; kembalikan token untuk dibagikan. */
export async function inviteCaregiver(scopes: string[]): Promise<CaregiverActionResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  let clean: string[];
  try {
    clean = sanitizeScopes(scopes);
  } catch (e) {
    return { ok: false, message: String(e instanceof Error ? e.message : e) };
  }
  const token = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/-/g, '');

  const supabase = createClient();
  const { error } = await supabase.from('caregiver_links').insert({
    patient_id: userId, invite_token: token, scopes: clean, status: 'pending',
  });
  if (error) return { ok: false, message: `Gagal membuat undangan: ${error.message}` };
  revalidatePath('/pendamping');
  return { ok: true, message: 'Undangan dibuat. Bagikan kode ini ke pendampingmu.', token };
}

/** Pasien mencabut akses seorang pendamping (by link id). */
export async function revokeCaregiver(linkId: string): Promise<CaregiverActionResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  const supabase = createClient();
  const { error } = await supabase
    .from('caregiver_links')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('id', linkId).eq('patient_id', userId);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/pendamping');
  return { ok: true, message: 'Akses pendamping dicabut.' };
}

/** Pendamping menukar kode undangan untuk mendapat akses. */
export async function claimCaregiverInvite(token: string): Promise<CaregiverActionResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  const clean = token.trim().replace(/-/g, '');
  if (!clean) return { ok: false, message: 'Masukkan kode undangan.' };

  const supabase = createClient();
  const { data, error } = await supabase.rpc('claim_caregiver_invite', { token: clean });
  if (error) return { ok: false, message: `Gagal menukar kode: ${error.message}` };
  if (!data) return { ok: false, message: 'Kode tidak valid, sudah dipakai, atau milikmu sendiri.' };
  revalidatePath('/pendamping');
  return { ok: true, message: 'Berhasil! Kamu kini bisa memantau pasien ini.' };
}

/** Pendamping berhenti mendampingi (mencabut keterlibatannya sendiri). */
export async function leaveCaregiver(linkId: string): Promise<CaregiverActionResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  const supabase = createClient();
  const { error } = await supabase
    .from('caregiver_links')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('id', linkId).eq('caregiver_id', userId);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/pendamping');
  return { ok: true, message: 'Kamu berhenti mendampingi.' };
}

// ── Web Push (E1) ────────────────────────────────────────────────
export interface PushResult { ok: boolean; message: string; }

export async function savePushSubscription(sub: { endpoint: string; p256dh: string; auth: string }): Promise<PushResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  if (!sub?.endpoint || !sub.p256dh || !sub.auth) return { ok: false, message: 'Langganan tidak valid.' };
  const supabase = createClient();
  const { error } = await supabase.from('push_subscriptions').upsert(
    { customer_id: userId, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
    { onConflict: 'endpoint' },
  );
  if (error) return { ok: false, message: `Gagal menyimpan: ${error.message}` };
  revalidatePath('/notifikasi');
  return { ok: true, message: 'Notifikasi push aktif.' };
}

export async function removePushSubscription(endpoint: string): Promise<PushResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  const supabase = createClient();
  const { error } = await supabase.from('push_subscriptions')
    .delete().eq('endpoint', endpoint).eq('customer_id', userId);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/notifikasi');
  return { ok: true, message: 'Notifikasi push dimatikan.' };
}

// ── Notifikasi (Fase C) ──────────────────────────────────────────
export interface NotifResult { ok: boolean; message: string; }

export async function markNotificationRead(id: string): Promise<NotifResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  const supabase = createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id).eq('recipient_id', userId).is('read_at', null);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/notifikasi');
  return { ok: true, message: 'Ditandai dibaca.' };
}

export async function markAllNotificationsRead(): Promise<NotifResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  const supabase = createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', userId).is('read_at', null);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/notifikasi');
  return { ok: true, message: 'Semua ditandai dibaca.' };
}

// ── Langganan / Pembayaran (Fase C) ──────────────────────────────
export interface BillingActionResult { ok: boolean; message: string; redirectUrl?: string | null; }

/**
 * Berlangganan Premium. Alur JUJUR: buat tagihan via provider → catat payment
 * (pending) → provider mengonfirmasi. Untuk mock, konfirmasi otomatis (satu
 * ketuk); untuk provider nyata, kembalikan redirectUrl & webhook yang aktifkan.
 */
export async function subscribePremium(): Promise<BillingActionResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  const plan = getPlan('premium');
  if (!plan) return { ok: false, message: 'Paket tidak tersedia.' };

  const supabase = createClient();
  const provider = activeProvider();
  const charge = await provider.createCharge({
    purpose: 'subscription', amount: plan.monthlyPrice, currency: plan.currency,
    description: 'AVA Premium (30 hari)',
  });

  const { data: pay, error } = await supabase.from('payments').insert({
    customer_id: userId, purpose: 'subscription', amount: plan.monthlyPrice,
    currency: plan.currency, provider: provider.id, external_id: charge.externalId, status: 'pending',
  }).select('id').single();
  if (error || !pay) return { ok: false, message: `Gagal membuat tagihan: ${error?.message ?? ''}` };

  if (!charge.autoConfirm) {
    // Provider nyata: arahkan ke halaman bayar; webhook yang mengaktifkan.
    return { ok: true, message: 'Lanjutkan pembayaran di halaman provider.', redirectUrl: charge.redirectUrl };
  }

  const { data: ok, error: cErr } = await supabase.rpc('mock_confirm_payment', { p_id: pay.id });
  if (cErr) return { ok: false, message: `Konfirmasi gagal: ${cErr.message}` };
  if (!ok) return { ok: false, message: 'Pembayaran tidak dapat dikonfirmasi.' };
  revalidatePath('/langganan');
  revalidatePath('/');
  return { ok: true, message: 'Selamat! Kamu kini pengguna Premium.' };
}

export async function cancelSubscription(): Promise<BillingActionResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  const supabase = createClient();
  const { error } = await supabase.rpc('cancel_my_subscription');
  if (error) return { ok: false, message: error.message };
  revalidatePath('/langganan');
  return { ok: true, message: 'Langganan dibatalkan. Berlaku hingga akhir periode.' };
}

// ── Wellness korporat / B2B (Fase lanjut) ────────────────────────
export interface EmployerResult { ok: boolean; message: string; }

/** Karyawan bergabung ke program wellness pemberi kerja via kode. */
export async function joinEmployer(code: string): Promise<EmployerResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  const clean = code.trim();
  if (!clean) return { ok: false, message: 'Masukkan kode dari pemberi kerja.' };

  const supabase = createClient();
  const { data, error } = await supabase.rpc('join_employer', { code: clean });
  if (error) return { ok: false, message: `Gagal bergabung: ${error.message}` };
  if (!data) return { ok: false, message: 'Kode pemberi kerja tidak dikenal.' };
  revalidatePath('/kerja');
  return { ok: true, message: 'Berhasil bergabung. Hanya data agregat anonim yang dibagikan ke pemberi kerja.' };
}

export async function leaveEmployer(employerId: string): Promise<EmployerResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  const supabase = createClient();
  const { error } = await supabase
    .from('employer_enrollments')
    .update({ status: 'left' })
    .eq('employer_id', employerId).eq('customer_id', userId);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/kerja');
  return { ok: true, message: 'Kamu keluar dari program pemberi kerja.' };
}

// ── Marketplace (Fase lanjut) ────────────────────────────────────
export interface OrderResult { ok: boolean; message: string; }
export interface CartItem { listingId: string; qty: number; }

/**
 * Checkout keranjang multi-item: satu order berisi banyak item lintas produk
 * (bahkan lintas vendor). Harga & stok DIVERIFIKASI server-side dari listing —
 * klien hanya mengirim listingId + qty. Lalu pembayaran (mock webhook) → 'paid'.
 */
export async function checkoutCart(items: CartItem[]): Promise<OrderResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  if (!Array.isArray(items) || items.length === 0) return { ok: false, message: 'Keranjang kosong.' };

  // Agregasi qty per listing (klien bisa kirim duplikat).
  const wanted = new Map<string, number>();
  for (const it of items) {
    const q = Math.trunc(Number(it.qty));
    if (it.listingId && Number.isInteger(q) && q > 0) {
      wanted.set(it.listingId, (wanted.get(it.listingId) ?? 0) + q);
    }
  }
  if (wanted.size === 0) return { ok: false, message: 'Tidak ada item yang valid.' };

  const supabase = createClient();
  const ids = [...wanted.keys()];
  const { data: rows } = await supabase
    .from('product_listings')
    .select('id, title, price, stock, vendor_id, status')
    .in('id', ids).eq('status', 'active');
  const listings = (rows ?? []) as { id: string; title: string; price: number; stock: number; vendor_id: string }[];
  if (listings.length !== ids.length) return { ok: false, message: 'Sebagian produk tidak lagi tersedia.' };

  const orderItems: { listing_id: string; vendor_id: string; title: string; qty: number; unit_price: number }[] = [];
  const lines: { unitPrice: number; qty: number }[] = [];
  for (const l of listings) {
    const q = wanted.get(l.id)!;
    if (l.stock < q) return { ok: false, message: `Stok "${l.title}" tidak mencukupi.` };
    orderItems.push({ listing_id: l.id, vendor_id: l.vendor_id, title: l.title, qty: q, unit_price: Number(l.price) });
    lines.push({ unitPrice: Number(l.price), qty: q });
  }
  const total = computeOrderTotal(lines);

  const { data: order, error: oErr } = await supabase
    .from('orders').insert({ customer_id: userId, total, status: 'pending' })
    .select('id').single();
  if (oErr || !order) return { ok: false, message: `Gagal membuat order: ${oErr?.message ?? ''}` };

  const { error: iErr } = await supabase.from('order_items')
    .insert(orderItems.map((oi) => ({ ...oi, order_id: order.id })));
  if (iErr) return { ok: false, message: `Gagal menambah item: ${iErr.message}` };

  const { data: pay, error: pErr } = await supabase.from('payments').insert({
    customer_id: userId, purpose: 'order', ref_id: order.id, amount: total,
    currency: 'IDR', provider: activeProvider().id, status: 'pending',
  }).select('id').single();
  if (pErr || !pay) return { ok: false, message: `Gagal membuat tagihan: ${pErr?.message ?? ''}` };

  const { data: ok, error: cErr } = await supabase.rpc('mock_confirm_payment', { p_id: pay.id });
  if (cErr) return { ok: false, message: `Konfirmasi gagal: ${cErr.message}` };
  if (!ok) return { ok: false, message: 'Pembayaran tidak dapat dikonfirmasi.' };

  revalidatePath('/toko');
  const n = orderItems.reduce((s, i) => s + i.qty, 0);
  return { ok: true, message: `Pesanan (${n} item) diterima & dibayar — Rp${total.toLocaleString('id-ID')}.` };
}

// ── Profil medis & data (PDP) ────────────────────────────────────
export interface ProfileResult { ok: boolean; message: string; }

export async function updateProfile(input: {
  fullName?: string; sex?: string; birthDate?: string; heightCm?: number; weightKg?: number;
}): Promise<ProfileResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };

  const patch: Record<string, unknown> = {};
  if (input.fullName !== undefined) patch.full_name = input.fullName.trim() || null;
  if (input.sex !== undefined) patch.sex = input.sex === 'pria' || input.sex === 'wanita' ? input.sex : null;
  if (input.birthDate !== undefined) patch.birth_date = input.birthDate || null;
  if (input.heightCm !== undefined) patch.height_cm = Number(input.heightCm) > 0 ? Number(input.heightCm) : null;
  if (input.weightKg !== undefined) patch.weight_kg = Number(input.weightKg) > 0 ? Number(input.weightKg) : null;

  const supabase = createClient();
  // Trigger DB mengabaikan perubahan `role`, jadi update ini aman.
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) return { ok: false, message: `Gagal menyimpan profil: ${error.message}` };
  revalidatePath('/akun');
  revalidatePath('/wellness');
  return { ok: true, message: 'Profil tersimpan.' };
}

export interface ExportResult { ok: boolean; message: string; data?: string }

/** Ekspor SEMUA data milik pengguna sebagai JSON (hak portabilitas UU PDP). */
export async function exportMyData(): Promise<ExportResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  const supabase = createClient();

  const [profile, readings, analyses, consults, consents, wellness, checkins, orders, subs] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('health_readings').select('*').eq('customer_id', userId),
    supabase.from('analysis_results').select('*'),
    supabase.from('consultations').select('*').eq('customer_id', userId),
    supabase.from('consents').select('*').eq('customer_id', userId),
    supabase.from('wellness_enrollments').select('*').eq('customer_id', userId),
    supabase.from('wellness_checkins').select('*').eq('customer_id', userId),
    supabase.from('orders').select('*').eq('customer_id', userId),
    supabase.from('subscriptions').select('*').eq('customer_id', userId),
  ]);

  const bundle = {
    exportedAt: new Date().toISOString(),
    profile: profile.data ?? null,
    healthReadings: readings.data ?? [],
    analysisResults: analyses.data ?? [],
    consultations: consults.data ?? [],
    consents: consents.data ?? [],
    wellnessEnrollments: wellness.data ?? [],
    wellnessCheckins: checkins.data ?? [],
    orders: orders.data ?? [],
    subscriptions: subs.data ?? [],
  };
  return { ok: true, message: 'Data siap diunduh.', data: JSON.stringify(bundle, null, 2) };
}

/** Hapus akun: hapus baris profil (cascade menghapus data turunannya). */
export async function deleteMyAccount(confirmText: string): Promise<ProfileResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  if (confirmText.trim().toUpperCase() !== 'HAPUS') {
    return { ok: false, message: 'Ketik HAPUS untuk konfirmasi.' };
  }
  const supabase = createClient();
  // Fungsi definer menghapus semua data dalam urutan aman-FK.
  const { data, error } = await supabase.rpc('delete_my_account');
  if (error) return { ok: false, message: `Gagal menghapus: ${error.message}` };
  if (!data) return { ok: false, message: 'Penghapusan tidak dapat diproses.' };
  await supabase.auth.signOut();
  return { ok: true, message: 'Akun & data kamu dihapus.' };
}

// ── Konsultasi ───────────────────────────────────────────────────
export interface BookResult { ok: boolean; message: string; }

export async function bookConsultation(
  _prev: BookResult | null,
  formData: FormData,
): Promise<BookResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  const doctorId = String(formData.get('doctorId') ?? '').trim();
  if (!doctorId) return { ok: false, message: 'Pilih dokter dulu.' };
  const shared = formData.getAll('reading').map((v) => String(v));

  const supabase = createClient();

  // Harga sadar-langganan: Premium dapat diskon konsultasi.
  const plan = await currentPlan(supabase);
  const pricing = priceConsultation(plan, BASE_CONSULT_FEE);

  const { data: consult, error } = await supabase.from('consultations').insert({
    customer_id: userId,
    doctor_id: doctorId,
    status: 'requested',
    shared_reading_ids: shared,
    fee: pricing.payable,
  }).select('id').single();
  if (error || !consult) return { ok: false, message: `Gagal membuat permintaan: ${error?.message ?? ''}` };

  // Catat tagihan konsultasi (pending) — dibayar saat/selepas konsultasi.
  await supabase.from('payments').insert({
    customer_id: userId, purpose: 'consultation', ref_id: consult.id,
    amount: pricing.payable, currency: 'IDR', provider: activeProvider().id, status: 'pending',
  });

  revalidatePath('/konsultasi');
  const hemat = pricing.discount > 0 ? ` (hemat Rp${pricing.discount.toLocaleString('id-ID')} berkat Premium)` : '';
  return { ok: true, message: `Permintaan konsultasi terkirim${hemat}. Menunggu konfirmasi dokter.` };
}

export async function rateConsultation(id: string, rating: number, comment: string): Promise<BookResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  const r = Math.trunc(Number(rating));
  if (r < 1 || r > 5) return { ok: false, message: 'Beri rating 1–5.' };
  const supabase = createClient();
  const { error } = await supabase.from('consultations')
    .update({ rating: r, rating_comment: comment.trim() || null })
    .eq('id', id).eq('customer_id', userId);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/konsultasi');
  return { ok: true, message: 'Terima kasih atas penilaianmu!' };
}

export async function cancelConsultation(id: string): Promise<BookResult> {
  const { userId } = await getCustomerAuth();
  if (!userId) return { ok: false, message: 'Silakan masuk dulu.' };
  const supabase = createClient();
  const { error } = await supabase.from('consultations')
    .update({ status: 'cancelled' }).eq('id', id).eq('customer_id', userId);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/konsultasi');
  return { ok: true, message: 'Konsultasi dibatalkan.' };
}
