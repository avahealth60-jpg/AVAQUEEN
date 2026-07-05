'use client';
import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { confirmConsultation, completeConsultation, declineConsultation, type ActionResult } from '../app/actions';

function ConfirmBtn() {
  const { pending } = useFormStatus();
  return <button className="btn" type="submit" disabled={pending}>{pending ? 'Menyimpan…' : 'Konfirmasi & jadwalkan'}</button>;
}

export function ConfirmForm({ id }: { id: string }) {
  const [state, action] = useFormState<ActionResult | null, FormData>(confirmConsultation, null);
  const [open, setOpen] = useState(false);
  if (!open) return <button className="btn btn--ghost" onClick={() => setOpen(true)}>Konfirmasi</button>;
  return (
    <form action={action} style={{ marginTop: 10 }}>
      <input type="hidden" name="id" value={id} />
      <div className="field">
        <label>Jadwal</label>
        <input name="scheduledAt" className="input" type="datetime-local" required />
      </div>
      <div className="field">
        <label>Tautan ruang konsultasi (Zoom/Meet)</label>
        <input name="joinUrl" className="input" placeholder="https://…" />
        <div className="hint">Tempel tautan rapatmu. (Otomatisasi Zoom menyusul di produksi.)</div>
      </div>
      <ConfirmBtn />
      {state && !state.ok && <div className="note note--bad">{state.message}</div>}
    </form>
  );
}

export function CompleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function done() { start(async () => { await completeConsultation(id); router.refresh(); }); }
  return <button className="btn" onClick={done} disabled={pending}>{pending ? 'Menyelesaikan…' : 'Tandai selesai'}</button>;
}

export function DeclineButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function decline() { start(async () => { await declineConsultation(id); router.refresh(); }); }
  return <button className="btn btn--ghost" onClick={decline} disabled={pending}>{pending ? 'Menolak…' : 'Tolak'}</button>;
}
