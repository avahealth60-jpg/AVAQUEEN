'use client';
// apps/customer/components/ManualActivityForm.tsx — catat aktivitas tanpa wearable.
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logActivity } from '../app/actions';

// value dikonversi ke satuan kanonik (tidur: jam → menit) sebelum dikirim.
const ROWS: { metric: string; label: string; unit: string; toCanonical: (v: number) => number }[] = [
  { metric: 'steps', label: 'Langkah', unit: 'langkah', toCanonical: (v) => v },
  { metric: 'sleep_minutes', label: 'Tidur', unit: 'jam', toCanonical: (v) => Math.round(v * 60) },
  { metric: 'active_minutes', label: 'Menit aktif', unit: 'menit', toCanonical: (v) => v },
];

export function ManualActivityForm() {
  const router = useRouter();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);

  async function save(metric: string, toCanonical: (v: number) => number) {
    const raw = Number(vals[metric]);
    if (!Number.isFinite(raw) || raw <= 0) { setNote({ kind: 'bad', text: 'Isi angka yang valid.' }); return; }
    setBusy(metric); setNote(null);
    const r = await logActivity(metric, toCanonical(raw));
    setNote({ kind: r.ok ? 'ok' : 'bad', text: r.message });
    if (r.ok) { setVals((v) => ({ ...v, [metric]: '' })); router.refresh(); }
    setBusy(null);
  }

  return (
    <div className="card">
      <strong style={{ color: 'var(--ava-color-ink-900)' }}>Catat aktivitas manual</strong>
      <p className="hint" style={{ margin: '4px 0 12px' }}>Tak punya smartwatch? Catat sendiri — memberi makan program wellness-mu.</p>
      {ROWS.map((r) => (
        <div className="field" key={r.metric}>
          <label>{r.label}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="suffix" style={{ flex: 1 }}>
              <input className="input" type="number" inputMode="decimal" value={vals[r.metric] ?? ''}
                onChange={(e) => setVals((v) => ({ ...v, [r.metric]: e.target.value }))} placeholder="—" />
              <span className="unit">{r.unit}</span>
            </div>
            <button className="btn btn--ghost" disabled={busy !== null || !vals[r.metric]}
              onClick={() => save(r.metric, r.toCanonical)}>
              {busy === r.metric ? '…' : 'Catat'}
            </button>
          </div>
        </div>
      ))}
      {note && <div className={`note note--${note.kind}`}>{note.text}</div>}
    </div>
  );
}
