'use client';
import React, { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { bookConsultation, type BookResult } from '../app/actions';
import type { DoctorOption, ReadingOption } from '../lib/consult';

function fmt(ts: string) { return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }); }
function SubmitBtn() {
  const { pending } = useFormStatus();
  return <button className="btn" type="submit" disabled={pending}>{pending ? 'Mengirim…' : 'Minta konsultasi'}</button>;
}

export function ConsultBooking({ doctors, readings }: { doctors: DoctorOption[]; readings: ReadingOption[] }) {
  const [state, action] = useFormState<BookResult | null, FormData>(bookConsultation, null);
  const [open, setOpen] = useState(false);

  if (doctors.length === 0) {
    return <div className="empty"><strong>Belum ada dokter tersedia</strong>Dokter ditambahkan oleh admin AVA.</div>;
  }
  if (!open && !state?.ok) {
    return <button className="btn" onClick={() => setOpen(true)}>Minta konsultasi baru</button>;
  }
  if (state?.ok) {
    return <div className="note note--ok">{state.message}</div>;
  }

  return (
    <form action={action}>
      <div className="field">
        <label htmlFor="doctorId">Pilih dokter</label>
        <select id="doctorId" name="doctorId" className="select" required defaultValue="">
          <option value="" disabled>Pilih…</option>
          {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Bagikan hasil (opsional)</label>
        {readings.length === 0 ? (
          <div className="hint">Belum ada hasil untuk dibagikan.</div>
        ) : (
          <div className="checks">
            {readings.map((r) => (
              <label key={r.id} className="check">
                <input type="checkbox" name="reading" value={r.id} />
                <span>{r.label} · <strong>{r.display}</strong> <span className="muted">{fmt(r.takenAt)}</span></span>
              </label>
            ))}
          </div>
        )}
        <div className="hint">Hanya hasil yang kamu centang yang bisa dilihat dokter.</div>
      </div>
      <SubmitBtn />
      {state && !state.ok && <div className="note note--bad">{state.message}</div>}
    </form>
  );
}
