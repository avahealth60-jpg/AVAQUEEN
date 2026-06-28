// apps/customer/lib/catalog.ts — metadata input, diturunkan dari REFERENCE_CATALOG
// agar label/satuan tidak terduplikasi dari sumber kebenaran domain.
import { REFERENCE_CATALOG } from '@ava/domain';

export type MetricKind = 'single' | 'bp';
export interface MetricOption {
  type: string; label: string; unit: string; kind: MetricKind;
}

const single = (key: 'glucose_fasting' | 'spo2' | 'heart_rate' | 'temperature'): MetricOption => ({
  type: key,
  label: REFERENCE_CATALOG[key].label,
  unit: REFERENCE_CATALOG[key].unit,
  kind: 'single',
});

export const METRIC_OPTIONS: MetricOption[] = [
  single('glucose_fasting'),
  single('spo2'),
  single('heart_rate'),
  single('temperature'),
  { type: 'blood_pressure', label: 'Tekanan darah', unit: 'mmHg', kind: 'bp' },
];

export function metricLabel(type: string): string {
  return METRIC_OPTIONS.find((m) => m.type === type)?.label ?? type;
}
export function metricUnit(type: string): string {
  return METRIC_OPTIONS.find((m) => m.type === type)?.unit ?? '';
}

export const CONSENT_PURPOSE = 'health_analysis';
