'use client';
// apps/customer/components/ReadingForm.tsx — input hasil + tampilkan analisis.
import React, { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { submitReading, type SubmitResult } from '../app/actions';
import { METRIC_OPTIONS } from '../lib/catalog';
import { triageMeta } from './widgets';
import Link from 'next/link';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <button className="btn" type="submit" disabled={pending}>{pending ? 'Menganalisis…' : 'Catat & analisis'}</button>;
}

export function ReadingForm() {
  const [type, setType] = useState(METRIC_OPTIONS[0]!.type);
  const [state, action] = useFormState<SubmitResult | null, FormData>(submitReading, null);
  const opt = METRIC_OPTIONS.find((m) => m.type === type)!;

  return (
    <>
      <form action={action} key={state?.ok ? 'reset' : 'form'}>
        <div className="field">
          <label htmlFor="type">Jenis pemeriksaan</label>
          <select id="type" name="type" className="select" value={type} onChange={(e) => setType(e.target.value)}>
            {METRIC_OPTIONS.map((m) => <option key={m.type} value={m.type}>{m.label}</option>)}
          </select>
        </div>

        {opt.kind === 'bp' ? (
          <div className="row2">
            <div className="field">
              <label htmlFor="systolic">Sistolik</label>
              <div className="suffix"><input id="systolic" name="systolic" className="input" type="number" inputMode="numeric" required /><span className="unit">mmHg</span></div>
            </div>
            <div className="field">
              <label htmlFor="diastolic">Diastolik</label>
              <div className="suffix"><input id="diastolic" name="diastolic" className="input" type="number" inputMode="numeric" required /><span className="unit">mmHg</span></div>
            </div>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="value">Nilai</label>
            <div className="suffix">
              <input id="value" name="value" className="input" type="number" inputMode="decimal" step="any" required />
              <span className="unit">{opt.unit}</span>
            </div>
          </div>
        )}

        <SubmitBtn />
        {state && !state.ok && <div className="note note--bad">{state.message}</div>}
      </form>

      {state?.ok && state.triage && (
        <div className={`result result--${triageMeta(state.triage).cls}`} role="status">
          <span className="result__tag"><span className="result__dot" />{triageMeta(state.triage).label}</span>
          <p className="result__text">{state.explanation}</p>
          {state.suggestConsultation && (
            <div className="result__cta">
              <Link className="btn btn--ghost" href="/konsultasi" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Pertimbangkan konsultasi dengan dokter
              </Link>
            </div>
          )}
          <div className="disclaimer">{state.disclaimer}</div>
        </div>
      )}
    </>
  );
}
