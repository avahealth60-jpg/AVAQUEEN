'use client';
import React from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { submitCalibration, type ActionResult } from '../app/actions';
import type { LabDeviceRow } from '../lib/data';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <button className="btn" type="submit" disabled={pending}>{pending ? 'Menyimpan…' : 'Catat kalibrasi & QC'}</button>;
}

export function SubmitCalibrationForm({ devices }: { devices: LabDeviceRow[] }) {
  const [state, action] = useFormState<ActionResult | null, FormData>(submitCalibration, null);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action}>
      <div className="field">
        <label htmlFor="deviceId">Alat</label>
        <select id="deviceId" name="deviceId" className="select" required defaultValue="">
          <option value="" disabled>Pilih alat…</option>
          {devices.map((d) => (
            <option key={d.id} value={d.id}>{d.serial} · {d.modelName}</option>
          ))}
        </select>
      </div>
      <div className="grid2" style={{ gap: 14 }}>
        <div className="field">
          <label htmlFor="performedAt">Tanggal kalibrasi</label>
          <input id="performedAt" name="performedAt" className="input" type="date" defaultValue={today} required />
        </div>
        <div className="field">
          <label htmlFor="performedBy">Pelaksana</label>
          <input id="performedBy" name="performedBy" className="input" placeholder="Nama teknisi" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="qcResult">Hasil QC</label>
        <select id="qcResult" name="qcResult" className="select" required defaultValue="lulus">
          <option value="lulus">Lulus — badge AVA Verified akan terbit</option>
          <option value="perlu_tinjau">Perlu tinjau — tanpa badge</option>
          <option value="gagal">Gagal — tanpa badge</option>
        </select>
        <div className="hint">Hanya hasil “Lulus” yang menerbitkan badge (otomatis).</div>
      </div>
      <div className="field">
        <label htmlFor="certificateUrl">URL sertifikat (opsional)</label>
        <input id="certificateUrl" name="certificateUrl" className="input" placeholder="https://…" />
      </div>
      <div className="field">
        <label htmlFor="notes">Catatan (opsional)</label>
        <input id="notes" name="notes" className="input" placeholder="mis. dalam toleransi" />
      </div>
      <SubmitBtn />
      {state && <div className={`note ${state.ok ? 'note--ok' : 'note--bad'}`}>{state.message}</div>}
    </form>
  );
}
