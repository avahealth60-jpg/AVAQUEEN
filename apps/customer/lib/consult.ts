// apps/customer/lib/consult.ts — data konsultasi sisi masyarakat (RLS).
import { createClient } from './supabase/server';
import { getCustomerAuth } from './auth';
import { metricLabel } from './catalog';

export interface DoctorOption { id: string; name: string; }
export async function doctors(): Promise<DoctorOption[]> {
  const supabase = createClient();
  const { data } = await supabase.from('profiles').select('id, full_name').eq('role', 'doctor').order('full_name');
  return ((data ?? []) as { id: string; full_name: string | null }[]).map((d) => ({ id: d.id, name: d.full_name ?? 'Dokter' }));
}

export interface ReadingOption { id: string; label: string; display: string; takenAt: string; }
export async function shareableReadings(): Promise<ReadingOption[]> {
  const supabase = createClient();
  // Hanya reading MILIK SENDIRI (sejak Fase C, RLS bisa mengizinkan pendamping
  // membaca reading pasien — jangan sampai ikut tampil di daftar berbagi).
  const { userId } = await getCustomerAuth();
  if (!userId) return [];
  const { data } = await supabase.from('health_readings').select('id, reading_type, value, taken_at')
    .eq('customer_id', userId)
    .order('taken_at', { ascending: false }).limit(20);
  return ((data ?? []) as { id: string; reading_type: string; value: Record<string, unknown>; taken_at: string }[]).map((r) => ({
    id: r.id,
    label: metricLabel(r.reading_type),
    display: r.reading_type === 'blood_pressure' ? `${r.value.systolic}/${r.value.diastolic}` : String(r.value.value ?? ''),
    takenAt: r.taken_at,
  }));
}

export interface ConsultView {
  id: string; doctorName: string; status: string; scheduledAt: string | null;
  joinUrl: string | null; sharedCount: number; fee: number; doctorNote: string | null; rating: number | null;
}
export async function myConsultations(): Promise<ConsultView[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('consultations')
    .select('id, doctor_id, status, scheduled_at, join_url, shared_reading_ids, fee, doctor_note, rating')
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as { id: string; doctor_id: string; status: string; scheduled_at: string | null; join_url: string | null; shared_reading_ids: string[]; fee: number; doctor_note: string | null; rating: number | null }[];
  const docIds = [...new Set(rows.map((r) => r.doctor_id))];
  const names = new Map<string, string>();
  if (docIds.length) {
    const { data: docs } = await supabase.from('profiles').select('id, full_name').in('id', docIds);
    ((docs ?? []) as { id: string; full_name: string | null }[]).forEach((d) => names.set(d.id, d.full_name ?? 'Dokter'));
  }
  return rows.map((r) => ({
    id: r.id, doctorName: names.get(r.doctor_id) ?? 'Dokter', status: r.status,
    scheduledAt: r.scheduled_at, joinUrl: r.join_url, sharedCount: r.shared_reading_ids?.length ?? 0, fee: r.fee,
    doctorNote: r.doctor_note ?? null, rating: r.rating ?? null,
  }));
}
