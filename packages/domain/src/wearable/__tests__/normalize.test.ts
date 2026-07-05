import { describe, it, expect } from 'vitest';
import {
  normalizeWearableSample,
  normalizeWearableBatch,
  resolveMetric,
  toCanonicalUnit,
  shouldCreateAnalysis,
  WEARABLE_METRICS,
  WearableNormalizationError,
  type WearableSample,
} from '../index.js';

const at = '2026-07-05T08:00:00Z';

function sample(over: Partial<WearableSample> & Pick<WearableSample, 'metric' | 'value'>): WearableSample {
  return { takenAt: at, source: 'health_connect', ...over };
}

describe('resolveMetric — pemetaan alias lintas provider', () => {
  it('memetakan nama Health Connect ke kunci kanonik', () => {
    expect(resolveMetric('HeartRate')?.key).toBe('heart_rate');
    expect(resolveMetric('OxygenSaturation')?.key).toBe('spo2');
    expect(resolveMetric('StepCount')?.key).toBe('steps');
  });
  it('tahan terhadap variasi spasi/underscore/kapital', () => {
    expect(resolveMetric('resting_heart_rate')?.key).toBe('heart_rate');
    expect(resolveMetric('Blood Oxygen')?.key).toBe('spo2');
  });
  it('mengembalikan null untuk metrik tak dikenal', () => {
    expect(resolveMetric('vo2max')).toBeNull();
  });
});

describe('toCanonicalUnit — konversi satuan', () => {
  it('Fahrenheit → Celsius', () => {
    expect(toCanonicalUnit(WEARABLE_METRICS.temperature, 98.6, '°F')).toBeCloseTo(37, 5);
  });
  it('jam → menit untuk tidur', () => {
    expect(toCanonicalUnit(WEARABLE_METRICS.sleep_minutes, 7.5, 'hours')).toBe(450);
  });
  it('km → meter untuk jarak', () => {
    expect(toCanonicalUnit(WEARABLE_METRICS.distance_meters, 3, 'km')).toBe(3000);
  });
  it('satuan setara diterima (percent → %)', () => {
    expect(toCanonicalUnit(WEARABLE_METRICS.spo2, 97, 'percent')).toBe(97);
  });
  it('satuan tak dikenal → lempar (fail-fast)', () => {
    expect(() => toCanonicalUnit(WEARABLE_METRICS.temperature, 300, 'kelvin')).toThrow(
      WearableNormalizationError,
    );
  });
});

describe('normalizeWearableSample — metrik klinis ditriase deterministik', () => {
  it('SpO₂ 88% → segera', () => {
    const n = normalizeWearableSample(sample({ metric: 'OxygenSaturation', value: 88, unit: '%' }))!;
    expect(n.kind).toBe('clinical');
    expect(n.triage).toBe('segera');
    expect(n.readingType).toBe('spo2');
  });
  it('detak jantung istirahat 72 → normal', () => {
    const n = normalizeWearableSample(sample({ metric: 'HeartRate', value: 72, unit: 'bpm' }))!;
    expect(n.triage).toBe('normal');
  });
  it('detak jantung 110 → perhatian', () => {
    const n = normalizeWearableSample(sample({ metric: 'HeartRate', value: 110 }))!;
    expect(n.triage).toBe('perhatian');
  });
  it('suhu dari wearable dalam °F ikut ditriase setelah dikonversi', () => {
    const n = normalizeWearableSample(sample({ metric: 'BodyTemperature', value: 103, unit: '°F' }))!;
    expect(n.value).toBeCloseTo(39.44, 1);
    expect(n.triage).toBe('segera');
  });
});

describe('INVARIAN non-SaMD — metrik gaya hidup tidak pernah ditriase', () => {
  it('langkah → triage null, kind lifestyle', () => {
    const n = normalizeWearableSample(sample({ metric: 'Steps', value: 12000 }))!;
    expect(n.kind).toBe('lifestyle');
    expect(n.triage).toBeNull();
  });
  it('tidur → triage null walau nilai ekstrem', () => {
    const n = normalizeWearableSample(sample({ metric: 'SleepSession', value: 1, unit: 'hours' }))!;
    expect(n.triage).toBeNull();
  });
  it('HRV → tidak ditriase', () => {
    const n = normalizeWearableSample(sample({ metric: 'HeartRateVariability', value: 20 }))!;
    expect(n.triage).toBeNull();
  });
  it('semua metrik lifestyle di registri memang triage null', () => {
    for (const spec of Object.values(WEARABLE_METRICS)) {
      if (spec.kind !== 'lifestyle') continue;
      const n = normalizeWearableSample(sample({ metric: spec.key, value: 1 }))!;
      expect(n.triage).toBeNull();
    }
  });
});

describe('normalizeWearableSample — penanganan edge', () => {
  it('metrik tak dikenal → null (di-skip, tidak menebak)', () => {
    expect(normalizeWearableSample(sample({ metric: 'vo2max', value: 42 }))).toBeNull();
  });
  it('nilai bukan angka berhingga → lempar', () => {
    expect(() => normalizeWearableSample(sample({ metric: 'HeartRate', value: NaN }))).toThrow(
      WearableNormalizationError,
    );
  });
  it('membawa source & deviceModel ke hasil', () => {
    const n = normalizeWearableSample(
      sample({ metric: 'Steps', value: 8000, source: 'zepp', deviceModel: 'Amazfit Bip 5' }),
    )!;
    expect(n.source).toBe('zepp');
    expect(n.deviceModel).toBe('Amazfit Bip 5');
  });
});

describe('normalizeWearableBatch & shouldCreateAnalysis', () => {
  it('men-skip metrik tak dikenal, mempertahankan yang dikenal', () => {
    const out = normalizeWearableBatch([
      sample({ metric: 'HeartRate', value: 70 }),
      sample({ metric: 'vo2max', value: 42 }),
      sample({ metric: 'Steps', value: 9000 }),
    ]);
    expect(out.map((n) => n.readingType)).toEqual(['heart_rate', 'steps']);
  });
  it('analysis dibuat hanya untuk klinis bertriase', () => {
    const hr = normalizeWearableSample(sample({ metric: 'HeartRate', value: 70 }))!;
    const steps = normalizeWearableSample(sample({ metric: 'Steps', value: 9000 }))!;
    expect(shouldCreateAnalysis(hr)).toBe(true);
    expect(shouldCreateAnalysis(steps)).toBe(false);
  });
});
