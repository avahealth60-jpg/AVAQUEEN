// apps/partner/lib/consult.ts — data konsultasi sisi dokter (RLS).
import { createClient } from './supabase/server';
import type { Triage } from '@ava/domain';

export interface SharedReading { id: string; type: string; display: string; triage: Triage | null; }
export interface DoctorConsult {
  id: string; patientName: string; status: string; scheduledAt: string | null;
  joinUrl: string | null; fee: number; sharedReadings: SharedReading[];
}

const LABEL: Record<string, string> = {
  glucose_fasting: 'Gula darah puasa', spo2: 'SpO₂', heart_rate: 'Detak jantung',
  temperature: 'Suhu', blood_pressure: 'Tekanan darah',
};
function disp(type: string, v: Record<string, unknown>) {
  return type === 'blood_pressure' ? `${v.systolic}/${v.diastolic}` : String(v.value ?? '');
}

export async function doctorConsultations(): Promise<DoctorConsult[]> {
  const supabase = createClient();
  const { data: cs } = await supabase
    .from('consultations')
    .select('id, customer_id, status, scheduled_at, join_url, shared_reading_ids, fee')
    .order('created_at', { ascending: false });
  const rows = (cs ?? []) as { id: string; customer_id: string; status: string; scheduled_at: string | null; join_url: string | null; shared_reading_ids: string[]; fee: number }[];
  if (rows.length === 0) return [];

  // Nama pasien (RLS "doctor reads own patients").
  const patientIds = [...new Set(rows.map((r) => r.customer_id))];
  const names = new Map<string, string>();
  const { data: pats } = await supabase.from('profiles').select('id, full_name').in('id', patientIds);
  ((pats ?? []) as { id: string; full_name: string | null }[]).forEach((p) => names.set(p.id, p.full_name ?? 'Pasien'));

  // Hasil yang dibagikan (RLS "doctor reads shared readings/analysis").
  const allShared = [...new Set(rows.flatMap((r) => r.shared_reading_ids ?? []))];
  const readingMap = new Map<string, { type: string; display: string }>();
  const triageMap = new Map<string, Triage>();
  if (allShared.length) {
    const { data: rd } = await supabase.from('health_readings').select('id, reading_type, value').in('id', allShared);
    ((rd ?? []) as { id: string; reading_type: string; value: Record<string, unknown> }[])
      .forEach((r) => readingMap.set(r.id, { type: r.reading_type, display: disp(r.reading_type, r.value) }));
    const { data: an } = await supabase.from('analysis_results').select('reading_id, triage').in('reading_id', allShared);
    ((an ?? []) as { reading_id: string; triage: Triage }[]).forEach((a) => triageMap.set(a.reading_id, a.triage));
  }

  return rows.map((r) => ({
    id: r.id,
    patientName: names.get(r.customer_id) ?? 'Pasien',
    status: r.status,
    scheduledAt: r.scheduled_at,
    joinUrl: r.join_url,
    fee: r.fee,
    sharedReadings: (r.shared_reading_ids ?? []).map((id) => {
      const rd = readingMap.get(id);
      return { id, type: rd ? (LABEL[rd.type] ?? rd.type) : '—', display: rd?.display ?? '', triage: triageMap.get(id) ?? null };
    }),
  }));
}

export interface DoctorEarnings { completed: number; gross: number; avaCut: number; net: number; }
export async function doctorEarnings(): Promise<DoctorEarnings> {
  const supabase = createClient();
  const { data } = await supabase.from('commissions').select('gross_amount, commission_amount');
  const rows = (data ?? []) as { gross_amount: number; commission_amount: number }[];
  const gross = rows.reduce((s, r) => s + Number(r.gross_amount), 0);
  const avaCut = rows.reduce((s, r) => s + Number(r.commission_amount), 0);
  return { completed: rows.length, gross, avaCut, net: gross - avaCut };
}
