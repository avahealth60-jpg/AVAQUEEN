// Parity: pastikan logika di Edge Function (_shared/domain.ts) identik dengan @ava/domain.
import assert from 'node:assert/strict';
import * as dom from '../../packages/domain/dist/index.js';
import * as edge from '../functions/_shared/domain.ts'; // butuh --experimental-strip-types

let pass = 0;
function ok(name, cond) { assert.ok(cond, name); pass++; console.log('  ✓ ' + name); }

ok('disclaimer identik', dom.EDUCATIONAL_DISCLAIMER === edge.EDUCATIONAL_DISCLAIMER);

const cases = [
  new Date('2025-01-31T00:00:00Z'),
  new Date('2024-01-31T00:00:00Z'),
  new Date('2025-11-15T00:00:00Z'),
];
for (const d of cases) {
  for (const m of [1, 6, 12]) {
    ok(`addMonths(${d.toISOString().slice(0,10)},${m})`,
       dom.addMonths(d, m).toISOString() === edge.addMonths(d, m).toISOString());
  }
}

for (const qc of ['lulus', 'perlu_tinjau', 'gagal']) {
  const a = dom.decideBadge({ qc, performedAt: cases[0], intervalMonths: 12 });
  const b = edge.decideBadge(qc, cases[0], 12);
  ok(`decideBadge(${qc}).issued`, a.issued === b.issued);
  if (a.issued) ok(`decideBadge(${qc}).expiry`, a.expiresAt.toISOString() === b.expiresAt.toISOString());
}

// --- Wearable (Fase A): normalisasi edge == domain ---
const wearableCases = [
  { metric: 'HeartRate', value: 72, unit: 'bpm' },
  { metric: 'HeartRate', value: 110, unit: null },
  { metric: 'OxygenSaturation', value: 88, unit: '%' },
  { metric: 'Blood Oxygen', value: 97, unit: 'percent' },
  { metric: 'BodyTemperature', value: 103, unit: '°F' },
  { metric: 'bp_systolic', value: 185, unit: 'mmHg' },
  { metric: 'Steps', value: 12000, unit: null },
  { metric: 'SleepSession', value: 7.5, unit: 'hours' },
  { metric: 'vo2max', value: 42, unit: null }, // tak dikenal → keduanya null
];
for (const c of wearableCases) {
  const a = dom.normalizeWearableSample({ ...c, takenAt: '2026-07-05T08:00:00Z', source: 'health_connect' });
  const b = edge.normalizeWearableSample(c);
  const label = `wearable ${c.metric}=${c.value}${c.unit ?? ''}`;
  if (a === null || b === null) {
    ok(`${label} (skip)`, a === null && b === null);
    continue;
  }
  ok(`${label} .readingType`, a.readingType === b.readingType);
  ok(`${label} .kind`, a.kind === b.kind);
  ok(`${label} .triage`, a.triage === b.triage);
  ok(`${label} .value`, Math.abs(a.value - b.value) < 1e-6);
}

// --- Alert pendamping (Fase C): edge == domain ---
const alertCases = [
  { patientName: 'Ibu', label: 'SpO₂', display: '88', unit: '%', triage: 'segera' },
  { patientName: 'Ayah', label: 'Detak jantung', display: '110', unit: 'bpm', triage: 'perhatian' },
  { patientName: 'Nenek', label: 'Suhu', display: '36.8', unit: '°C', triage: 'normal' },
];
for (const c of alertCases) {
  const a = dom.caregiverAlertFor(c);
  const b = edge.caregiverAlertFor(c);
  const label = `caregiverAlert ${c.label}/${c.triage}`;
  if (a === null || b === null) {
    ok(`${label} (null)`, a === null && b === null);
    continue;
  }
  ok(`${label} .title`, a.title === b.title);
  ok(`${label} .body`, a.body === b.body);
}

console.log(`\n=== Parity: ${pass} lulus ===`);
