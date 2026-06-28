// apps/partner/app/actions.ts
// Server Actions untuk penulisan mitra. Berjalan di server memakai klien SESI
// (anon + JWT pengguna) → RLS menegakkan kepemilikan. Tidak ada service-role.
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../lib/supabase/server';
import { getPartnerAuth } from '../lib/auth';

export interface ActionResult { ok: boolean; message: string; }

/** Vendor mendaftarkan alat baru ke armadanya. */
export async function registerDevice(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await getPartnerAuth();
  if (auth.role !== 'vendor' || !auth.org) {
    return { ok: false, message: 'Hanya vendor dengan organisasi yang dapat mendaftarkan alat.' };
  }
  const modelId = String(formData.get('modelId') ?? '').trim();
  const serial = String(formData.get('serial') ?? '').trim();
  if (!modelId || !serial) return { ok: false, message: 'Model dan nomor seri wajib diisi.' };

  const supabase = createClient();
  const { error } = await supabase.from('devices').insert({
    model_id: modelId,
    serial,
    vendor_id: auth.org.id, // RLS "vendor registers own devices" memverifikasi keanggotaan
    status: 'active',
  });
  if (error) {
    const dup = error.code === '23505';
    return { ok: false, message: dup ? `Nomor seri "${serial}" sudah terdaftar.` : `Gagal: ${error.message}` };
  }
  revalidatePath('/');
  return { ok: true, message: `Alat ${serial} terdaftar.` };
}

/** Lab mencatat kalibrasi + hasil QC. QC 'lulus' otomatis menerbitkan badge (trigger). */
export async function submitCalibration(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await getPartnerAuth();
  if (auth.role !== 'lab' || !auth.org) {
    return { ok: false, message: 'Hanya lab dengan organisasi yang dapat mencatat kalibrasi.' };
  }
  const deviceId = String(formData.get('deviceId') ?? '').trim();
  const performedAt = String(formData.get('performedAt') ?? '').trim();
  const performedBy = String(formData.get('performedBy') ?? '').trim();
  const certificateUrl = String(formData.get('certificateUrl') ?? '').trim();
  const qcResult = String(formData.get('qcResult') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim();

  if (!deviceId || !performedAt) return { ok: false, message: 'Alat dan tanggal kalibrasi wajib diisi.' };
  if (!['lulus', 'perlu_tinjau', 'gagal'].includes(qcResult)) {
    return { ok: false, message: 'Hasil QC tidak valid.' };
  }

  const supabase = createClient();
  // 1) Kalibrasi (next_due_at diisi otomatis oleh trigger dari interval model).
  const { data: cal, error: calErr } = await supabase
    .from('calibrations')
    .insert({
      device_id: deviceId,
      lab_id: auth.org.id, // RLS "lab manages own calibrations"
      performed_at: performedAt,
      performed_by: performedBy || null,
      certificate_url: certificateUrl || null,
    })
    .select('id')
    .single();
  if (calErr || !cal) return { ok: false, message: `Gagal menyimpan kalibrasi: ${calErr?.message ?? ''}` };

  // 2) Hasil QC. Bila 'lulus', trigger trg_issue_badge_on_qc menerbitkan badge.
  const { error: qcErr } = await supabase.from('qc_results').insert({
    calibration_id: cal.id,
    result: qcResult,
    notes: notes || null,
  });
  if (qcErr) return { ok: false, message: `Kalibrasi tersimpan, tapi QC gagal disimpan: ${qcErr.message}` };

  revalidatePath('/');
  return {
    ok: true,
    message: qcResult === 'lulus'
      ? 'Kalibrasi & QC lulus tersimpan. Badge AVA Verified diterbitkan.'
      : `Kalibrasi & QC (${qcResult}) tersimpan. Badge tidak diterbitkan.`,
  };
}

// ── Konsultasi (sisi dokter) ─────────────────────────────────────
export async function confirmConsultation(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await getPartnerAuth();
  if (auth.role !== 'doctor') return { ok: false, message: 'Hanya dokter yang dapat mengonfirmasi.' };
  const id = String(formData.get('id') ?? '').trim();
  const scheduledAt = String(formData.get('scheduledAt') ?? '').trim();
  const joinUrl = String(formData.get('joinUrl') ?? '').trim();
  if (!id) return { ok: false, message: 'Konsultasi tidak valid.' };

  // RLS "doctor updates assigned consultation" membatasi ke doctor_id = auth.uid().
  const supabase = createClient();
  const { error } = await supabase.from('consultations')
    .update({
      status: 'confirmed',
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      // Tempel link Zoom/Meet. Otomatisasi via edge function zoom-create-meeting (produksi).
      join_url: joinUrl || null,
    })
    .eq('id', id);
  if (error) return { ok: false, message: `Gagal mengonfirmasi: ${error.message}` };
  revalidatePath('/');
  return { ok: true, message: 'Konsultasi dikonfirmasi.' };
}

export async function completeConsultation(id: string): Promise<ActionResult> {
  const auth = await getPartnerAuth();
  if (auth.role !== 'doctor') return { ok: false, message: 'Hanya dokter yang dapat menyelesaikan.' };
  const supabase = createClient();
  const { error } = await supabase.from('consultations').update({ status: 'completed' }).eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/');
  return { ok: true, message: 'Konsultasi selesai. Komisi tercatat.' };
}
