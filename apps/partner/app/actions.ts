// apps/partner/app/actions.ts
// Server Actions untuk penulisan mitra. Berjalan di server memakai klien SESI
// (anon + JWT pengguna) → RLS menegakkan kepemilikan. Tidak ada service-role.
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../lib/supabase/server';
import { getPartnerAuth } from '../lib/auth';
import { assertConsultTransition, type ConsultStatus } from '@ava/domain';

export interface ActionResult { ok: boolean; message: string; }

/** Ambil status konsultasi saat ini (RLS: hanya yang ditugaskan ke dokter). */
async function consultStatus(
  supabase: ReturnType<typeof createClient>,
  id: string,
): Promise<ConsultStatus | null> {
  const { data } = await supabase.from('consultations').select('status').eq('id', id).maybeSingle();
  return (data?.status as ConsultStatus | undefined) ?? null;
}

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

// ── Chat konsultasi (D2, sisi dokter) ────────────────────────────
export interface ChatMessage { id: string; body: string; createdAt: string; mine: boolean; }

export async function fetchConsultMessages(consultationId: string): Promise<ChatMessage[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('consultation_messages')
    .select('id, sender_id, body, created_at')
    .eq('consultation_id', consultationId)
    .order('created_at', { ascending: true });
  return ((data ?? []) as { id: string; sender_id: string; body: string; created_at: string }[])
    .map((m) => ({ id: m.id, body: m.body, createdAt: m.created_at, mine: m.sender_id === user.id }));
}

export async function sendConsultMessage(consultationId: string, body: string): Promise<{ ok: boolean; message: string }> {
  const auth = await getPartnerAuth();
  if (auth.role !== 'doctor') return { ok: false, message: 'Hanya dokter yang dapat mengirim.' };
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Silakan masuk dulu.' };
  const t = body.trim();
  if (!t) return { ok: false, message: 'Pesan kosong.' };
  const { error } = await supabase.from('consultation_messages')
    .insert({ consultation_id: consultationId, sender_id: user.id, body: t });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: '' };
}

// ── Marketplace (sisi vendor) ────────────────────────────────────
/** Vendor memasang listing alat ke etalase. Verifikasi "AVA Verified"
 *  diturunkan otomatis dari badge aktif (fungsi verified_listing_ids). */
export async function publishListing(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await getPartnerAuth();
  if (auth.role !== 'vendor' || !auth.org) {
    return { ok: false, message: 'Hanya vendor dengan organisasi yang dapat memasang listing.' };
  }
  const modelId = String(formData.get('modelId') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const price = Number(formData.get('price'));
  const stock = Math.trunc(Number(formData.get('stock')));
  const description = String(formData.get('description') ?? '').trim();

  if (!modelId || !title) return { ok: false, message: 'Model dan judul wajib diisi.' };
  if (!Number.isFinite(price) || price < 0) return { ok: false, message: 'Harga tidak valid.' };
  if (!Number.isInteger(stock) || stock < 0) return { ok: false, message: 'Stok tidak valid.' };

  const supabase = createClient();
  const { error } = await supabase.from('product_listings').insert({
    vendor_id: auth.org.id, // RLS "vendor manages own listings" memverifikasi keanggotaan
    model_id: modelId,
    title,
    description: description || null,
    price,
    stock,
    status: 'active',
  });
  if (error) return { ok: false, message: `Gagal memasang listing: ${error.message}` };
  revalidatePath('/');
  return { ok: true, message: `Listing "${title}" tayang di toko.` };
}

// ── Wellness korporat (sisi pemberi kerja) ───────────────────────
export interface JoinCodeResult { ok: boolean; message: string; code?: string | null; }

/** Admin pemberi kerja mengatur/mengacak kode gabung karyawan. */
export async function setJoinCode(
  _prev: JoinCodeResult | null,
  formData: FormData,
): Promise<JoinCodeResult> {
  const auth = await getPartnerAuth();
  if (auth.org?.kind !== 'employer') {
    return { ok: false, message: 'Hanya admin pemberi kerja yang dapat mengatur kode.' };
  }
  const code = String(formData.get('code') ?? '').trim(); // kosong → diacak fungsi
  const supabase = createClient();
  const { data, error } = await supabase.rpc('set_employer_join_code', {
    p_employer: auth.org.id, p_code: code,
  });
  if (error) return { ok: false, message: `Gagal: ${error.message}` };
  if (!data) return { ok: false, message: 'Tidak berwenang mengatur kode.' };
  revalidatePath('/');
  return { ok: true, message: 'Kode gabung diperbarui.', code: data as string };
}

/** Vendor mengubah status pemenuhan pesanan (paid→shipped→delivered / cancel). */
export async function setOrderStatus(orderId: string, status: string): Promise<ActionResult> {
  const auth = await getPartnerAuth();
  if (auth.role !== 'vendor') return { ok: false, message: 'Hanya vendor.' };
  const supabase = createClient();
  const { data, error } = await supabase.rpc('vendor_set_order_status', { p_order: orderId, p_status: status });
  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: 'Perubahan status tidak diizinkan.' };
  revalidatePath('/');
  const LABEL: Record<string, string> = { shipped: 'dikirim', delivered: 'diterima', cancelled: 'dibatalkan' };
  return { ok: true, message: `Pesanan ${LABEL[status] ?? status}.` };
}

/** Vendor menyalakan/mematikan listing (RLS "vendor manages own listings"). */
export async function toggleListing(listingId: string, active: boolean): Promise<ActionResult> {
  const auth = await getPartnerAuth();
  if (auth.role !== 'vendor') return { ok: false, message: 'Hanya vendor.' };
  const supabase = createClient();
  const { error } = await supabase.from('product_listings')
    .update({ status: active ? 'active' : 'inactive' }).eq('id', listingId);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/');
  return { ok: true, message: active ? 'Listing ditayangkan.' : 'Listing disembunyikan.' };
}

export async function updateListingStock(listingId: string, stock: number): Promise<ActionResult> {
  const auth = await getPartnerAuth();
  if (auth.role !== 'vendor') return { ok: false, message: 'Hanya vendor.' };
  const s = Math.trunc(Number(stock));
  if (!Number.isInteger(s) || s < 0) return { ok: false, message: 'Stok tidak valid.' };
  const supabase = createClient();
  const { error } = await supabase.from('product_listings').update({ stock: s }).eq('id', listingId);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/');
  return { ok: true, message: 'Stok diperbarui.' };
}

// ── Kredensial dokter (STR/SIP) ──────────────────────────────────
export async function saveDoctorCredentials(strNo: string, sipNo: string): Promise<ActionResult> {
  const auth = await getPartnerAuth();
  if (auth.role !== 'doctor') return { ok: false, message: 'Hanya dokter.' };
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Silakan masuk dulu.' };
  const { error } = await supabase.from('profiles')
    .update({ str_no: strNo.trim() || null, sip_no: sipNo.trim() || null }).eq('id', user.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/');
  return { ok: true, message: 'Kredensial tersimpan. Menunggu verifikasi admin.' };
}

// ── Faskes ───────────────────────────────────────────────────────
export async function setFaskesJoinCode(_prev: JoinCodeResult | null, formData: FormData): Promise<JoinCodeResult> {
  const auth = await getPartnerAuth();
  if (auth.org?.kind !== 'faskes') return { ok: false, message: 'Hanya admin faskes.' };
  const code = String(formData.get('code') ?? '').trim();
  const supabase = createClient();
  const { data, error } = await supabase.rpc('faskes_set_join_code', { p_faskes: auth.org.id, p_code: code });
  if (error) return { ok: false, message: `Gagal: ${error.message}` };
  if (!data) return { ok: false, message: 'Tidak berwenang.' };
  revalidatePath('/');
  return { ok: true, message: 'Kode gabung dokter diperbarui.', code: data as string };
}

/** Dokter bergabung ke faskes via kode. */
export async function joinFaskes(code: string): Promise<ActionResult> {
  const auth = await getPartnerAuth();
  if (auth.role !== 'doctor') return { ok: false, message: 'Hanya dokter yang dapat bergabung.' };
  const supabase = createClient();
  const { data, error } = await supabase.rpc('join_faskes', { code: code.trim() });
  if (error) return { ok: false, message: `Gagal: ${error.message}` };
  if (!data) return { ok: false, message: 'Kode faskes tidak dikenal.' };
  revalidatePath('/');
  return { ok: true, message: 'Berhasil bergabung ke faskes.' };
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
  const cur = await consultStatus(supabase, id);
  if (!cur) return { ok: false, message: 'Konsultasi tidak ditemukan.' };
  try { assertConsultTransition(cur, 'confirmed'); }
  catch (e) { return { ok: false, message: e instanceof Error ? e.message : String(e) }; }

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

/** Dokter menolak permintaan konsultasi (requested/confirmed → cancelled). */
export async function declineConsultation(id: string): Promise<ActionResult> {
  const auth = await getPartnerAuth();
  if (auth.role !== 'doctor') return { ok: false, message: 'Hanya dokter yang dapat menolak.' };
  const supabase = createClient();
  const cur = await consultStatus(supabase, id);
  if (!cur) return { ok: false, message: 'Konsultasi tidak ditemukan.' };
  try { assertConsultTransition(cur, 'cancelled'); }
  catch (e) { return { ok: false, message: e instanceof Error ? e.message : String(e) }; }

  const { error } = await supabase.from('consultations').update({ status: 'cancelled' }).eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/');
  return { ok: true, message: 'Permintaan ditolak.' };
}

/** Dokter menyimpan catatan/resep untuk pasien (tampil ke pasien). */
export async function saveConsultNote(id: string, note: string): Promise<ActionResult> {
  const auth = await getPartnerAuth();
  if (auth.role !== 'doctor') return { ok: false, message: 'Hanya dokter yang dapat menulis catatan.' };
  const supabase = createClient();
  // RLS "doctor updates assigned consultation" membatasi ke konsultasi dokter ini.
  const { error } = await supabase.from('consultations')
    .update({ doctor_note: note.trim() || null }).eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/');
  return { ok: true, message: 'Catatan tersimpan & terlihat pasien.' };
}

export async function completeConsultation(id: string): Promise<ActionResult> {
  const auth = await getPartnerAuth();
  if (auth.role !== 'doctor') return { ok: false, message: 'Hanya dokter yang dapat menyelesaikan.' };
  const supabase = createClient();
  const cur = await consultStatus(supabase, id);
  if (!cur) return { ok: false, message: 'Konsultasi tidak ditemukan.' };
  try { assertConsultTransition(cur, 'completed'); }
  catch (e) { return { ok: false, message: e instanceof Error ? e.message : String(e) }; }

  const { error } = await supabase.from('consultations').update({ status: 'completed' }).eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/');
  return { ok: true, message: 'Konsultasi selesai. Komisi tercatat.' };
}
