import { describe, it, expect } from 'vitest';
import {
  calcBmi,
  bmiCategory,
  healthyWeightRange,
  calcBmr,
  calcTdee,
  caloriesBurned,
  activityCalories,
  listActivities,
  dailyWaterMl,
  runningPace,
  ACTIVITY_METS,
  CalculatorError,
} from '../index.js';

describe('IMT / BMI', () => {
  it('menghitung IMT & kategori normal', () => {
    const r = calcBmi(70, 175); // 22.9
    expect(r.bmi).toBeCloseTo(22.9, 1);
    expect(r.category).toBe('normal');
    expect(r.label).toBe('Normal');
  });
  it('kategori sesuai ambang Kemenkes', () => {
    expect(bmiCategory(16)).toBe('sangat_kurus');
    expect(bmiCategory(18)).toBe('kurus');
    expect(bmiCategory(22)).toBe('normal');
    expect(bmiCategory(25)).toBe('normal');
    expect(bmiCategory(26)).toBe('gemuk');
    expect(bmiCategory(30)).toBe('obesitas');
  });
  it('rentang berat sehat untuk 170 cm', () => {
    const { minKg, maxKg } = healthyWeightRange(170);
    expect(minKg).toBeCloseTo(53.5, 1); // 18.5 * 1.7^2
    expect(maxKg).toBeCloseTo(72.3, 1); // 25 * 1.7^2
  });
  it('menolak input tak valid', () => {
    expect(() => calcBmi(0, 170)).toThrow(CalculatorError);
    expect(() => calcBmi(70, -1)).toThrow(CalculatorError);
  });
});

describe('BMR / TDEE — Mifflin–St Jeor', () => {
  it('BMR pria', () => {
    // 10*70 + 6.25*175 - 5*30 + 5 = 700 + 1093.75 - 150 + 5 = 1648.75 → 1649
    expect(calcBmr('pria', 70, 175, 30)).toBe(1649);
  });
  it('BMR wanita', () => {
    // 10*60 + 6.25*165 - 5*30 - 161 = 600 + 1031.25 - 150 - 161 = 1320.25 → 1320
    expect(calcBmr('wanita', 60, 165, 30)).toBe(1320);
  });
  it('TDEE = BMR × faktor aktivitas', () => {
    expect(calcTdee(1649, 'sedang')).toBe(Math.round(1649 * 1.55)); // 2556
  });
});

describe('Kalori olahraga (MET)', () => {
  it('rumus MET: MET×3.5×kg/200×menit', () => {
    // lari sedang 9.8 MET, 70kg, 30 menit → 9.8*3.5*70/200*30 = 360.15 → 360
    expect(caloriesBurned(9.8, 70, 30)).toBe(360);
  });
  it('activityCalories memakai preset', () => {
    expect(activityCalories('lari_sedang', 70, 30)).toBe(caloriesBurned(ACTIVITY_METS.lari_sedang.met, 70, 30));
  });
  it('aktivitas tak dikenal → lempar', () => {
    expect(() => activityCalories('terbang', 70, 30)).toThrow(CalculatorError);
  });
  it('daftar aktivitas lengkap & ber-MET > 0', () => {
    const list = listActivities();
    expect(list.length).toBe(Object.keys(ACTIVITY_METS).length);
    for (const a of list) expect(a.met).toBeGreaterThan(0);
  });
});

describe('Air harian & pace', () => {
  it('air ≈ 30 ml/kg', () => {
    expect(dailyWaterMl(70)).toBe(2100);
  });
  it('pace lari 30 menit / 5 km = 6:00 /km', () => {
    const p = runningPace(30, 5);
    expect(p.minPerKm).toBe(6);
    expect(p.text).toBe('6:00 /km');
  });
  it('pace membulatkan detik', () => {
    expect(runningPace(31, 5).text).toBe('6:12 /km'); // 6.2 → 6:12
  });
});
