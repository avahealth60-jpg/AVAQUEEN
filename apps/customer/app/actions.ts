// apps/customer/app/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../lib/supabase/server';
import { getCustomerAuth } from '../lib/auth';
import { CONSENT_PURPOSE } from '../lib/catalog';
import { analyzeReading, type ReadingInput, type Triage } from '@ava/domain';

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
  const { error } = await supabase.from('consultations').insert({
    customer_id: userId,
    doctor_id: doctorId,
    status: 'requested',
    shared_reading_ids: shared,
  });
  if (error) return { ok: false, message: `Gagal membuat permintaan: ${error.message}` };
  revalidatePath('/konsultasi');
  return { ok: true, message: 'Permintaan konsultasi terkirim. Menunggu konfirmasi dokter.' };
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
