import { describe, it, expect } from 'vitest';
import {
  aggregateDaily,
  dailyStatus,
  computeStreak,
  bestStreak,
  summarizeProgress,
  listPrograms,
  getProgram,
  isAutoTracked,
  WELLNESS_CATALOG,
  WellnessError,
  type DailyValue,
} from '../index.js';

const d = (date: string, value: number): DailyValue => ({ date, value });

describe('aggregateDaily', () => {
  it('menjumlahkan nilai pada tanggal sama (sum) & terurut menaik', () => {
    const out = aggregateDaily([d('2026-07-03', 3000), d('2026-07-01', 4000), d('2026-07-03', 2000)], 'sum');
    expect(out).toEqual([d('2026-07-01', 4000), d('2026-07-03', 5000)]);
  });
  it("mode 'max' mengambil nilai terbesar per hari", () => {
    const out = aggregateDaily([d('2026-07-01', 300), d('2026-07-01', 450)], 'max');
    expect(out).toEqual([d('2026-07-01', 450)]);
  });
  it('mengabaikan nilai non-finite', () => {
    const out = aggregateDaily([d('2026-07-01', NaN), d('2026-07-01', 100)], 'sum');
    expect(out).toEqual([d('2026-07-01', 100)]);
  });
});

describe('dailyStatus', () => {
  it('achieved bila >= target', () => expect(dailyStatus(10000, 10000)).toBe('achieved'));
  it('on_track bila >= 70% target', () => expect(dailyStatus(7500, 10000)).toBe('on_track'));
  it('behind bila < 70% target', () => expect(dailyStatus(5000, 10000)).toBe('behind'));
  it('target <= 0 dilarang', () => expect(() => dailyStatus(1, 0)).toThrow(WellnessError));
});

describe('computeStreak — beruntun terkini', () => {
  it('menghitung hari berturut yang memenuhi target', () => {
    const days = [d('2026-07-03', 10500), d('2026-07-04', 11000), d('2026-07-05', 10200)];
    expect(computeStreak(days, 10000)).toBe(3);
  });
  it('putus bila hari terakhir tak memenuhi target', () => {
    const days = [d('2026-07-04', 11000), d('2026-07-05', 8000)];
    expect(computeStreak(days, 10000)).toBe(0);
  });
  it('putus bila ada celah tanggal', () => {
    const days = [d('2026-07-01', 10500), d('2026-07-03', 10500), d('2026-07-04', 10500)];
    // 04 & 03 berurutan & memenuhi (2); 02 hilang → berhenti sebelum 01.
    expect(computeStreak(days, 10000)).toBe(2);
  });
  it('deret kosong → 0', () => expect(computeStreak([], 10000)).toBe(0));
});

describe('bestStreak — rekor terpanjang', () => {
  it('menemukan run terpanjang meski ada hari gagal di antara', () => {
    const days = [
      d('2026-07-01', 10500), // ok
      d('2026-07-02', 9000), //  gagal
      d('2026-07-03', 10500), // ok
      d('2026-07-04', 10500), // ok
      d('2026-07-05', 10500), // ok
    ];
    expect(bestStreak(days, 10000)).toBe(3);
  });
});

describe('summarizeProgress', () => {
  it('meringkas langkah harian (sum)', () => {
    const days = [d('2026-07-03', 12000), d('2026-07-04', 6000), d('2026-07-05', 10000)];
    const s = summarizeProgress('steps', 10000, days, 'sum');
    expect(s.latest).toBe(10000);
    expect(s.percentToday).toBe(100);
    expect(s.status).toBe('achieved');
    expect(s.daysMetTarget).toBe(2);
    expect(s.totalDays).toBe(3);
    expect(s.streak).toBe(1); // hanya hari terakhir memenuhi (04 gagal)
  });
  it('percentToday dibatasi 0..100', () => {
    const s = summarizeProgress('steps', 10000, [d('2026-07-05', 25000)]);
    expect(s.percentToday).toBe(100);
  });
  it('tanpa data → latest 0, status behind', () => {
    const s = summarizeProgress('steps', 10000, []);
    expect(s.latest).toBe(0);
    expect(s.status).toBe('behind');
    expect(s.streak).toBe(0);
  });
});

describe('katalog wellness', () => {
  it('listPrograms mengembalikan semua entri', () => {
    expect(listPrograms().length).toBe(Object.keys(WELLNESS_CATALOG).length);
  });
  it('getProgram mengenali kode & menolak yang tak dikenal', () => {
    expect(getProgram('langkah_harian')?.dailyTarget).toBe(10000);
    expect(getProgram('entah_apa')).toBeNull();
  });
  it('metrik langkah/tidur/aktif otomatis terlacak; hidrasi & checkin tidak', () => {
    expect(isAutoTracked('steps')).toBe(true);
    expect(isAutoTracked('sleep_minutes')).toBe(true);
    expect(isAutoTracked('hydration_ml')).toBe(false);
    expect(isAutoTracked('checkin')).toBe(false);
  });
  it('semua program punya target > 0 dan durasi > 0', () => {
    for (const p of listPrograms()) {
      expect(p.dailyTarget).toBeGreaterThan(0);
      expect(p.durationDays).toBeGreaterThan(0);
    }
  });
});
