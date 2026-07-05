'use client';
// apps/partner/components/NoteForm.tsx — catatan/resep dokter (tampil ke pasien).
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveConsultNote } from '../app/actions';

export function NoteForm({ id, initial }: { id: string; initial: string | null }) {
  const router = useRouter();
  const [note, setNote] = useState(initial ?? '');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  async function save() {
    setBusy(true); setOk(false);
    const r = await saveConsultNote(id, note);
    setOk(r.ok);
    if (r.ok) router.refresh();
    setBusy(false);
  }

  return (
    <div style={{ marginTop: 8 }}>
      <label className="hint" style={{ display: 'block', marginBottom: 4 }}>Catatan / resep untuk pasien</label>
      <textarea
        className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)}
        placeholder="Ringkasan, anjuran, atau resep. Terlihat oleh pasien."
        style={{ resize: 'vertical' }}
      />
      <button className="btn btn--ghost" style={{ marginTop: 6 }} onClick={save} disabled={busy}>
        {busy ? 'Menyimpan…' : 'Simpan catatan'}
      </button>
      {ok && <span className="hint" style={{ marginLeft: 10 }}>Tersimpan ✓</span>}
    </div>
  );
}
