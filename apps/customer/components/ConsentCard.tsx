'use client';
import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { grantConsent } from '../app/actions';

export function ConsentCard() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  function agree() {
    start(async () => {
      const r = await grantConsent();
      if (!r.ok) { setErr(r.message); return; }
      router.refresh();
    });
  }
  return (
    <div className="card card--brand">
      <h2 className="consent__title">Persetujuan pemrosesan data kesehatan</h2>
      <p className="consent__body">
        Sebelum mencatat hasil pemeriksaan, kami memerlukan persetujuanmu (UU PDP). Datamu:
      </p>
      <ul className="consent__list">
        <li>Hanya kamu yang bisa melihat hasilmu.</li>
        <li>Dipakai untuk memberi analisis <strong>edukatif</strong> — bukan diagnosis.</li>
        <li>Bisa kamu tarik kapan saja; datamu tetap milikmu.</li>
      </ul>
      <button className="btn" onClick={agree} disabled={pending}>
        {pending ? 'Menyimpan…' : 'Saya setuju'}
      </button>
      {err && <div className="note note--bad">{err}</div>}
    </div>
  );
}
