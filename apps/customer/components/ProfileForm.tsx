'use client';
// apps/customer/components/ProfileForm.tsx — edit profil medis (auto-isi kalkulator).
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile } from '../app/actions';
import type { MedicalProfile } from '../lib/data';

export function ProfileForm({ profile }: { profile: MedicalProfile }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.fullName ?? '');
  const [sex, setSex] = useState(profile.sex ?? '');
  const [birthDate, setBirthDate] = useState(profile.birthDate ?? '');
  const [heightCm, setHeightCm] = useState(profile.heightCm != null ? String(profile.heightCm) : '');
  const [weightKg, setWeightKg] = useState(profile.weightKg != null ? String(profile.weightKg) : '');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);

  async function save() {
    setBusy(true); setNote(null);
    const r = await updateProfile({
      fullName, sex, birthDate,
      heightCm: Number(heightCm) || undefined,
      weightKg: Number(weightKg) || undefined,
    });
    setNote({ kind: r.ok ? 'ok' : 'bad', text: r.message });
    if (r.ok) router.refresh();
    setBusy(false);
  }

  return (
    <div className="card">
      <div className="field">
        <label>Nama</label>
        <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nama lengkap" />
      </div>
      <div className="row2">
        <div className="field">
          <label>Jenis kelamin</label>
          <select className="select" value={sex} onChange={(e) => setSex(e.target.value)}>
            <option value="">—</option><option value="pria">Pria</option><option value="wanita">Wanita</option>
          </select>
        </div>
        <div className="field">
          <label>Tanggal lahir</label>
          <input className="input" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </div>
      </div>
      <div className="row2">
        <div className="field">
          <label>Tinggi (cm)</label>
          <input className="input" type="number" inputMode="decimal" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="mis. 170" />
        </div>
        <div className="field">
          <label>Berat (kg)</label>
          <input className="input" type="number" inputMode="decimal" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="mis. 65" />
        </div>
      </div>
      <button className="btn" onClick={save} disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan profil'}</button>
      <div className="hint" style={{ marginTop: 8 }}>Data ini dipakai untuk mengisi otomatis kalkulator wellness.</div>
      {note && <div className={`note note--${note.kind}`}>{note.text}</div>}
    </div>
  );
}
