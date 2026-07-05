'use client';
// apps/customer/components/WellnessCalculators.tsx
// Alat wellness siap-pakai: IMT, kebutuhan kalori, kalori olahraga. Semua
// dihitung langsung di browser (rumus terbuka @ava/domain) — tanpa upload/setup.
import React, { useMemo, useState } from 'react';
import {
  calcBmi, calcBmr, calcTdee, activityCalories, listActivities,
  dailyWaterMl, ACTIVITY_LEVEL_LABEL,
  type Sex, type ActivityLevel, type BmiCategory,
} from '@ava/domain';

const CAT_CLASS: Record<BmiCategory, string> = {
  sangat_kurus: 'pill--segera', kurus: 'pill--perhatian', normal: 'pill--normal',
  gemuk: 'pill--perhatian', obesitas: 'pill--segera',
};
const LEVELS: ActivityLevel[] = ['sedentary', 'ringan', 'sedang', 'aktif', 'sangat_aktif'];
const num = (s: string) => { const n = Number(s); return Number.isFinite(n) && n > 0 ? n : 0; };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}
function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: 11, color: 'var(--ava-color-ink-500)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ava-color-ink-900)' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--ava-color-ink-500)' }}>{sub}</div>}
    </div>
  );
}

export function WellnessCalculators() {
  const [berat, setBerat] = useState('');
  const [tinggi, setTinggi] = useState('');
  const [usia, setUsia] = useState('');
  const [sex, setSex] = useState<Sex>('pria');
  const [level, setLevel] = useState<ActivityLevel>('sedang');
  const [aktivitas, setAktivitas] = useState('lari_sedang');
  const [durasi, setDurasi] = useState('');

  const activities = useMemo(() => listActivities(), []);
  const w = num(berat), h = num(tinggi), a = num(usia), d = num(durasi);

  const bmi = w && h ? calcBmi(w, h) : null;
  const bmr = w && h && a ? calcBmr(sex, w, h, a) : null;
  const tdee = bmr ? calcTdee(bmr, level) : null;
  const air = w ? dailyWaterMl(w) : null;
  const kalOlahraga = w && d ? activityCalories(aktivitas, w, d) : null;

  return (
    <>
      <div className="section-h">Alat &amp; kalkulator</div>
      <p style={{ fontSize: 13, color: 'var(--ava-color-ink-500)', margin: '0 0 12px' }}>
        Tinggal isi data — langsung terhitung. Estimasi edukatif dengan rumus baku,
        bukan penilaian medis.
      </p>

      {/* Profil */}
      <div className="card">
        <div className="row2">
          <Field label="Berat (kg)"><input className="input" type="number" inputMode="decimal" value={berat} onChange={(e) => setBerat(e.target.value)} placeholder="mis. 65" /></Field>
          <Field label="Tinggi (cm)"><input className="input" type="number" inputMode="decimal" value={tinggi} onChange={(e) => setTinggi(e.target.value)} placeholder="mis. 170" /></Field>
        </div>
        <div className="row2">
          <Field label="Usia (tahun)"><input className="input" type="number" inputMode="numeric" value={usia} onChange={(e) => setUsia(e.target.value)} placeholder="mis. 30" /></Field>
          <Field label="Jenis kelamin">
            <select className="select" value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
              <option value="pria">Pria</option><option value="wanita">Wanita</option>
            </select>
          </Field>
        </div>
        <Field label="Tingkat aktivitas">
          <select className="select" value={level} onChange={(e) => setLevel(e.target.value as ActivityLevel)}>
            {LEVELS.map((l) => <option key={l} value={l}>{ACTIVITY_LEVEL_LABEL[l]}</option>)}
          </select>
        </Field>
      </div>

      {/* IMT */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ color: 'var(--ava-color-ink-900)' }}>Indeks Massa Tubuh (IMT)</strong>
          {bmi && <span className={`pill ${CAT_CLASS[bmi.category]}`}>{bmi.label}</span>}
        </div>
        {bmi ? (
          <>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Stat label="IMT" value={bmi.bmi.toFixed(1)} />
              <Stat label="Berat sehat" value={`${bmi.healthyMin}–${bmi.healthyMax}`} sub="kg untuk tinggimu" />
              {air && <Stat label="Air/hari" value={`${(air / 1000).toFixed(1)} L`} sub="≈ anjuran" />}
            </div>
          </>
        ) : <div className="hint" style={{ marginTop: 8 }}>Isi berat &amp; tinggi untuk melihat IMT.</div>}
      </div>

      {/* Kebutuhan kalori */}
      <div className="card">
        <strong style={{ color: 'var(--ava-color-ink-900)' }}>Kebutuhan kalori harian</strong>
        {tdee ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Stat label="BMR" value={`${bmr}`} sub="kal saat istirahat" />
            <Stat label="Kebutuhan" value={`${tdee}`} sub="kal/hari (aktivitas)" />
          </div>
        ) : <div className="hint" style={{ marginTop: 8 }}>Isi berat, tinggi &amp; usia untuk estimasi kalori.</div>}
      </div>

      {/* Kalori olahraga */}
      <div className="card">
        <strong style={{ color: 'var(--ava-color-ink-900)' }}>Kalori olahraga (lari, sepeda, dll)</strong>
        <div className="row2" style={{ marginTop: 12 }}>
          <Field label="Aktivitas">
            <select className="select" value={aktivitas} onChange={(e) => setAktivitas(e.target.value)}>
              {activities.map((ac) => <option key={ac.key} value={ac.key}>{ac.label}</option>)}
            </select>
          </Field>
          <Field label="Durasi (menit)"><input className="input" type="number" inputMode="numeric" value={durasi} onChange={(e) => setDurasi(e.target.value)} placeholder="mis. 30" /></Field>
        </div>
        {kalOlahraga != null ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Stat label="Perkiraan" value={`${kalOlahraga} kal`} sub="terbakar" />
          </div>
        ) : <div className="hint">Isi berat (di atas) &amp; durasi untuk perkiraan kalori.</div>}
      </div>
    </>
  );
}
