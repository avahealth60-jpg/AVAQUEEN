/**
 * AVA Health — Logika progres wellness (Fase B).
 * Murni, deterministik, tanpa I/O. Menghitung status harian, streak, dan
 * ringkasan progres dari deret nilai harian.
 */

import type {
  WellnessMetric,
  WellnessStatus,
  DailyValue,
  AggregateMode,
  ProgressSummary,
} from './types.js';

export class WellnessError extends Error {}

/** Selisih hari kalender (b - a) untuk tanggal 'YYYY-MM-DD' dalam UTC. */
function dayDiff(a: string, b: string): number {
  const ta = Date.parse(`${a}T00:00:00Z`);
  const tb = Date.parse(`${b}T00:00:00Z`);
  if (Number.isNaN(ta) || Number.isNaN(tb)) {
    throw new WellnessError(`Tanggal tidak valid: "${a}" atau "${b}" (harus YYYY-MM-DD).`);
  }
  return Math.round((tb - ta) / 86_400_000);
}

/** Tanggal sehari sebelum 'YYYY-MM-DD'. */
function prevDay(date: string): string {
  const t = Date.parse(`${date}T00:00:00Z`) - 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * Gabungkan beberapa reading dalam satu hari menjadi satu nilai per tanggal.
 * Mengembalikan deret terurut menaik berdasarkan tanggal.
 */
export function aggregateDaily(entries: readonly DailyValue[], mode: AggregateMode = 'sum'): DailyValue[] {
  const byDate = new Map<string, number>();
  const order: string[] = [];
  for (const e of entries) {
    if (!Number.isFinite(e.value)) continue;
    if (!byDate.has(e.date)) {
      byDate.set(e.date, e.value);
      order.push(e.date);
      continue;
    }
    const cur = byDate.get(e.date)!;
    if (mode === 'sum') byDate.set(e.date, cur + e.value);
    else if (mode === 'max') byDate.set(e.date, Math.max(cur, e.value));
    else byDate.set(e.date, e.value); // 'last' — asumsikan entri datang berurutan
  }
  return order
    .map((d) => ({ date: d, value: byDate.get(d)! }))
    .sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
}

/** Status pencapaian harian terhadap target. */
export function dailyStatus(value: number, target: number): WellnessStatus {
  if (target <= 0) throw new WellnessError('Target harus > 0.');
  if (value >= target) return 'achieved';
  if (value >= target * 0.7) return 'on_track';
  return 'behind';
}

/**
 * Rangkaian hari beruntun TERKINI yang memenuhi target, dihitung mundur dari
 * hari terakhir berdata. Celah tanggal (hari terlewat) memutus streak.
 */
export function computeStreak(daily: readonly DailyValue[], target: number): number {
  if (target <= 0) throw new WellnessError('Target harus > 0.');
  const sorted = aggregateDaily(daily, 'last'); // pastikan terurut & unik per tanggal
  if (sorted.length === 0) return 0;
  let streak = 0;
  let expected = sorted[sorted.length - 1]!.date;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const d = sorted[i]!;
    if (d.date !== expected) break; // ada celah tanggal → putus
    if (d.value < target) break; // target tak terpenuhi → putus
    streak++;
    expected = prevDay(expected);
  }
  return streak;
}

/** Rekor rangkaian beruntun terpanjang di seluruh deret. */
export function bestStreak(daily: readonly DailyValue[], target: number): number {
  if (target <= 0) throw new WellnessError('Target harus > 0.');
  const sorted = aggregateDaily(daily, 'last');
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    const consecutive = prev !== null && dayDiff(prev, d.date) === 1;
    if (d.value >= target && (run === 0 || consecutive)) {
      run += 1;
    } else if (d.value >= target) {
      run = 1; // memenuhi target tapi bukan hari berurutan → mulai run baru
    } else {
      run = 0;
    }
    if (run > best) best = run;
    prev = d.date;
  }
  return best;
}

/** Ringkas progres sebuah metrik terhadap target harian. */
export function summarizeProgress(
  metric: WellnessMetric,
  target: number,
  daily: readonly DailyValue[],
  mode: AggregateMode = 'sum',
): ProgressSummary {
  if (target <= 0) throw new WellnessError('Target harus > 0.');
  const sorted = aggregateDaily(daily, mode);
  const latest = sorted.length > 0 ? sorted[sorted.length - 1]!.value : 0;
  const percentToday = Math.max(0, Math.min(100, Math.round((latest / target) * 100)));
  const daysMetTarget = sorted.filter((d) => d.value >= target).length;
  return {
    metric,
    target,
    latest,
    percentToday,
    status: dailyStatus(latest, target),
    streak: computeStreak(sorted, target),
    bestStreak: bestStreak(sorted, target),
    daysMetTarget,
    totalDays: sorted.length,
  };
}
