'use client';
import React from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { registerDevice, type ActionResult } from '../app/actions';
import type { DeviceModel } from '@ava/db';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <button className="btn" type="submit" disabled={pending}>{pending ? 'Menyimpan…' : 'Daftarkan alat'}</button>;
}

export function RegisterDeviceForm({ models }: { models: DeviceModel[] }) {
  const [state, action] = useFormState<ActionResult | null, FormData>(registerDevice, null);
  return (
    <form action={action}>
      <div className="field">
        <label htmlFor="modelId">Model alat</label>
        <select id="modelId" name="modelId" className="select" required defaultValue="">
          <option value="" disabled>Pilih model…</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}{m.manufacturer ? ` · ${m.manufacturer}` : ''} (kalibrasi {m.calibration_interval_months} bln)
            </option>
          ))}
        </select>
        {models.length === 0 && <div className="hint">Belum ada model alat. Hubungi admin AVA untuk menambah model.</div>}
      </div>
      <div className="field">
        <label htmlFor="serial">Nomor seri</label>
        <input id="serial" name="serial" className="input" placeholder="mis. GC-2026-0001" required />
        <div className="hint">Harus unik di seluruh platform.</div>
      </div>
      <SubmitBtn />
      {state && <div className={`note ${state.ok ? 'note--ok' : 'note--bad'}`}>{state.message}</div>}
    </form>
  );
}
