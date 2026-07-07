'use client';
// apps/customer/components/RatingForm.tsx — nilai konsultasi selesai (1–5 bintang).
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { rateConsultation } from '../app/actions';

export function RatingForm({ id, current }: { id: string; current: number | null }) {
  const router = useRouter();
  const [rating, setRating] = useState(current ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(current != null);

  async function save() {
    if (rating < 1) return;
    setBusy(true);
    const r = await rateConsultation(id, rating, comment);
    if (r.ok) { setDone(true); router.refresh(); }
    setBusy(false);
  }

  if (done) {
    return (
      <div className="read__meta" style={{ marginTop: 6 }}>
        Penilaianmu: {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div className="hint" style={{ marginBottom: 4 }}>Beri penilaian:</div>
      <div style={{ display: 'flex', gap: 4, fontSize: 24, cursor: 'pointer' }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} role="button" aria-label={`${n} bintang`}
            onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)}
            style={{ color: (hover || rating) >= n ? '#F5A623' : 'var(--ava-color-line-strong, #cbd5e1)' }}>★</span>
        ))}
      </div>
      <input className="input" style={{ marginTop: 8 }} placeholder="Komentar (opsional)"
        value={comment} onChange={(e) => setComment(e.target.value)} />
      <button className="btn btn--ghost" style={{ marginTop: 8 }} disabled={busy || rating < 1} onClick={save}>
        {busy ? 'Menyimpan…' : 'Kirim penilaian'}
      </button>
    </div>
  );
}
