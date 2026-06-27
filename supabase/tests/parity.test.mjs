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
console.log(`\n=== Parity: ${pass} lulus ===`);
