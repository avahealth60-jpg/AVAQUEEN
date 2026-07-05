import { describe, it, expect } from 'vitest';
import {
  wellnessNudge,
  wellnessNudges,
  caregiverAlertFor,
  type WellnessNudgeInput,
} from '../index.js';

const prog = (over: Partial<WellnessNudgeInput>): WellnessNudgeInput => ({
  title: 'Langkah harian', unit: 'langkah', target: 10000, latest: 0, status: 'behind', streak: 0, ...over,
});

describe('wellnessNudge — nada sesuai status', () => {
  it('achieved → perayaan, menyebut streak bila > 1', () => {
    const n = wellnessNudge(prog({ status: 'achieved', latest: 10000, streak: 4 }));
    expect(n.tone).toBe('celebrate');
    expect(n.body).toContain('4 hari');
  });
  it('achieved streak 1 → tanpa menyebut hari beruntun', () => {
    const n = wellnessNudge(prog({ status: 'achieved', streak: 1 }));
    expect(n.tone).toBe('celebrate');
    expect(n.body).not.toContain('beruntun');
  });
  it('on_track → dorongan dgn sisa target', () => {
    const n = wellnessNudge(prog({ status: 'on_track', latest: 7500 }));
    expect(n.tone).toBe('encourage');
    expect(n.body).toContain('2.500'); // sisa 10000-7500 diformat id-ID
  });
  it('behind → ajakan lembut, tidak menghakimi', () => {
    const n = wellnessNudge(prog({ status: 'behind', latest: 100 }));
    expect(n.kind).toBe('wellness_restart');
    expect(n.tone).toBe('info');
  });
});

describe('wellnessNudges — prioritas & batas', () => {
  it('mengutamakan on_track, lalu behind, lalu achieved; dibatasi max', () => {
    const list = wellnessNudges([
      prog({ title: 'A', status: 'achieved' }),
      prog({ title: 'B', status: 'behind' }),
      prog({ title: 'C', status: 'on_track', latest: 8000 }),
    ], 2);
    expect(list.length).toBe(2);
    expect(list[0]!.kind).toBe('wellness_on_track'); // C dulu
    expect(list[1]!.kind).toBe('wellness_restart'); // lalu B
  });
});

describe('caregiverAlertFor — hanya non-normal, selalu edukatif', () => {
  const base = { patientName: 'Ibu', label: 'Saturasi oksigen (SpO₂)', display: '88', unit: '%' };
  it('normal → tidak ada alert (null)', () => {
    expect(caregiverAlertFor({ ...base, triage: 'normal' })).toBeNull();
  });
  it('segera → alert urgensi tinggi', () => {
    const a = caregiverAlertFor({ ...base, triage: 'segera' })!;
    expect(a.title).toContain('segera');
    expect(a.body).toContain('bukan diagnosis');
  });
  it('perhatian → alert perhatian', () => {
    const a = caregiverAlertFor({ ...base, triage: 'perhatian' })!;
    expect(a.title).toContain('perhatian');
  });
});
