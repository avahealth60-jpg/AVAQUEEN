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
