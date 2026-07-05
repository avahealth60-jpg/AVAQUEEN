// apps/customer/app/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../lib/supabase/server';
import { getCustomerAuth } from '../lib/auth';
import { CONSENT_PURPOSE, WEARABLE_CONSENT_PURPOSE } from '../lib/catalog';
import {
  analyzeReading,
  normalizeWearableBatch,
  getProgram,
  sanitizeScopes,
  getPlan,
  priceConsultation,
  effectivePlan,
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

  revalidatePath('/');
  return {
    ok: true,
    message: 'Hasil tersimpan.',
    triage: draft.triage,
    explanation: draft.explanation,
    disclaimer: draft.disclaimer,
    suggestConsultation: draft.suggest_consultation,
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
