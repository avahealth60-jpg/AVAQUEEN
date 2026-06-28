// apps/customer/lib/data.ts — baca data customer (RLS: hanya miliknya).
import { createClient } from './supabase/server';
import { CONSENT_PURPOSE, metricLabel, metricUnit } from './catalog';
import type { Triage } from '@ava/domain';

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
  triage: Triage | null;
  explanation: string | null;
  disclaimer: string | null;
}

function displayValue(type: string, value: Record<string, unknown>): string {
  if (type === 'blood_pressure') return `${value.systolic ?? '?'}/${value.diastolic ?? '?'}`;
  return String(value.value ?? '?');
}

export async function readings(): Promise<ReadingView[]> {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from('health_readings').select('*').order('taken_at', { ascending: false });
  const list = (rows ?? []) as { id: string; reading_type: string; value: Record<string, unknown>; taken_at: string }[];
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
      triage: a?.triage ?? null,
      explanation: a?.explanation ?? null,
      disclaimer: a?.disclaimer ?? null,
    };
  });
}

export interface TrendPoint { takenAt: string; n: number; triage: Triage | null; }
export interface Trend { type: string; label: string; unit: string; points: TrendPoint[]; }

/** Tren per jenis (untuk sparkline). Hanya metrik tunggal (bukan BP). */
export async function trends(): Promise<Trend[]> {
  const all = await readings();
  const map = new Map<string, Trend>();
  for (const r of [...all].reverse()) { // urut lama→baru untuk grafik
    if (r.type === 'blood_pressure') continue;
    const n = Number(r.display);
    if (Number.isNaN(n)) continue;
    if (!map.has(r.type)) map.set(r.type, { type: r.type, label: r.label, unit: r.unit, points: [] });
    map.get(r.type)!.points.push({ takenAt: r.takenAt, n, triage: r.triage });
  }
  return [...map.values()].filter((t) => t.points.length >= 2);
}
