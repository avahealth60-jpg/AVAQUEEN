'use client';
// apps/customer/components/PanelForm.tsx — isi banyak parameter sekaligus.
import React from 'react';
import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { submitPanel, type PanelResult } from '../app/actions';
import { triageMeta } from './widgets';

const FIELDS: { name: string; label: string; unit: string }[] = [
  { name: 'glucose_fasting', label: 'Gula darah puasa', unit: 'mg/dL' },
  { name: 'spo2', label: 'SpO₂', unit: '%' },
  { name: 'heart_rate', label: 'Detak jantung', unit: 'bpm' },
  { name: 'temperature', label: 'Suhu tubuh', unit: '°C' },
];

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <button className="btn" type="submit" disabled={pending}>{pending ? 'Menyimpan…' : 'Catat semua & analisis'}</button>;
}

export function PanelForm() {
  const [state, action] = useFormState<PanelResult | null, FormData>(submitPanel, null);

  return (
    <>
      <form action={action} key={state?.ok ? 'reset' : 'form'}>
        <div className="card">
          <p className="hint" style={{ marginBottom: 14 }}>Isi yang kamu punya — kosongkan sisanya. Semua dianalisis sekaligus.</p>
          {FIELDS.map((f) => (
            <div className="field" key={f.name}>
              <label htmlFor={f.name}>{f.label}</label>
              <div className="suffix">
                <input id={f.name} name={f.name} className="input" type="number" inputMode="decimal" step="any" placeholder="—" />
                <span className="unit">{f.unit}</span>
              </div>
            </div>
          ))}
          <div className="row2">
            <div className="field">
              <label htmlFor="systolic">Sistolik</label>
              <div className="suffix"><input id="systolic" name="systolic" className="input" type="number" inputMode="numeric" placeholder="—" /><span className="unit">mmHg</span></div>
            </div>
            <div className="field">
              <label htmlFor="diastolic">Diastolik</label>
              <div className="suffix"><input id="diastolic" name="diastolic" className="input" type="number" inputMode="numeric" placeholder="—" /><span className="unit">mmHg</span></div>
            </div>
          </div>
          <SubmitBtn />
          {state && !state.ok && <div className="note note--bad">{state.message}</div>}
        </div>
      </form>

      {state?.ok && state.items && (
        <div className={`result result--${triageMeta(state.worst ?? 'normal').cls}`} role="status">
          <span className="result__tag"><span className="result__dot" />Ringkasan: {triageMeta(state.worst ?? 'normal').label}</span>
          <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
            {state.items.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span className="result__text" style={{ fontSize: 14 }}>{it.label}</span>
                <span className={`pill pill--${triageMeta(it.triage).cls}`}>{triageMeta(it.triage).label}</span>
              </div>
            ))}
          </div>
          {state.suggestConsultation && (
            <div className="result__cta">
              <Link className="btn btn--ghost" href="/konsultasi" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Pertimbangkan konsultasi dengan dokter
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}
