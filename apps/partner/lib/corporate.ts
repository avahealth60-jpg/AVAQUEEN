// apps/partner/lib/corporate.ts — ringkasan agregat pemberi kerja (RLS + fungsi).
import { createClient } from './supabase/server';

export interface EmployerSummary {
  participants: number;
  suppressed: boolean;
  activeWellness: number | null;
  /** Tingkat partisipasi wellness (%) — null bila disembunyikan. */
  rate: number | null;
}

/** Kode gabung pemberi kerja (admin dapat membacanya via RLS "member reads own org"). */
export async function employerJoinCode(employerId: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('organizations').select('join_code').eq('id', employerId).maybeSingle();
  return (data?.join_code as string | null) ?? null;
}

// ── Faskes ───────────────────────────────────────────────────────
export interface FaskesSummary {
  doctors: number; consultations: number; completed: number; avgRating: number | null; gross: number;
}
export async function faskesSummary(faskesId: string): Promise<FaskesSummary | null> {
  const supabase = createClient();
  const { data } = await supabase.rpc('faskes_summary', { p_faskes: faskesId });
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    doctors: Number(row.doctors ?? 0),
    consultations: Number(row.consultations ?? 0),
    completed: Number(row.completed ?? 0),
    avgRating: row.avg_rating == null ? null : Number(row.avg_rating),
    gross: Number(row.gross ?? 0),
  };
}

export async function faskesDoctors(faskesId: string): Promise<{ id: string; name: string }[]> {
  const supabase = createClient();
  const { data: mems } = await supabase
    .from('organization_members').select('profile_id').eq('organization_id', faskesId);
  const ids = ((mems ?? []) as { profile_id: string }[]).map((m) => m.profile_id);
  if (ids.length === 0) return [];
  const { data: docs } = await supabase
    .from('profiles').select('id, full_name').in('id', ids).eq('role', 'doctor');
  return ((docs ?? []) as { id: string; full_name: string | null }[]).map((d) => ({ id: d.id, name: d.full_name ?? 'Dokter' }));
}

export async function faskesJoinCode(faskesId: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.from('organizations').select('join_code').eq('id', faskesId).maybeSingle();
  return (data?.join_code as string | null) ?? null;
}

export async function employerSummary(employerId: string): Promise<EmployerSummary | null> {
  const supabase = createClient();
  const { data } = await supabase.rpc('employer_wellness_summary', { p_employer: employerId });
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  const participants = Number(row.participants ?? 0);
  const suppressed = Boolean(row.suppressed);
  const activeWellness = row.active_wellness == null ? null : Number(row.active_wellness);
  const rate = suppressed || activeWellness == null || participants === 0
    ? null
    : Math.round((activeWellness / participants) * 100);
  return { participants, suppressed, activeWellness, rate };
}
