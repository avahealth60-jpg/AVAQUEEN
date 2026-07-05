'use client';
import React from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { publishListing, type ActionResult } from '../app/actions';
import type { DeviceModel } from '@ava/db';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <button className="btn" type="submit" disabled={pending}>{pending ? 'Menayangkan…' : 'Tayangkan ke toko'}</button>;
}

export function PublishListingForm({ models }: { models: DeviceModel[] }) {
  const [state, action] = useFormState<ActionResult | null, FormData>(publishListing, null);
  return (
    <form action={action}>
      <div className="field">
        <label htmlFor="l-model">Model alat</label>
        <select id="l-model" name="modelId" className="select" required defaultValue="">
          <option value="" disabled>Pilih model…</option>
          {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <div className="hint">Badge "AVA Verified" muncul otomatis bila unit model ini punya badge aktif.</div>
      </div>
      <div className="field">
        <label htmlFor="l-title">Judul listing</label>
        <input id="l-title" name="title" className="input" placeholder="mis. Tensimeter A — bergaransi" required />
      </div>
      <div className="field">
        <label htmlFor="l-desc">Deskripsi (opsional)</label>
        <input id="l-desc" name="description" className="input" placeholder="Kondisi, garansi, dll." />
      </div>
      <div className="field">
        <label htmlFor="l-price">Harga (Rp)</label>
        <input id="l-price" name="price" className="input" type="number" inputMode="numeric" min="0" required />
      </div>
      <div className="field">
        <label htmlFor="l-stock">Stok</label>
        <input id="l-stock" name="stock" className="input" type="number" inputMode="numeric" min="0" defaultValue={1} required />
      </div>
      <SubmitBtn />
      {state && <div className={`note ${state.ok ? 'note--ok' : 'note--bad'}`}>{state.message}</div>}
    </form>
  );
}
