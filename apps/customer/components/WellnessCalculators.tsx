'use client';
// apps/customer/components/WellnessCalculators.tsx
// Alat wellness siap-pakai: IMT, kalori, olahraga, target berat, makro, langkah.
// Terisi otomatis dari profil (bila ada). Semua dihitung di browser (rumus
// terbuka @ava/domain) — tanpa upload/setup.
import React, { useMemo, useState } from 'react';
import {
  calcBmi, calcBmr, calcTdee, activityCalories, listActivities, dailyWaterMl,
  targetWeightPlan, macros, stepsToDistanceKm, stepsCalories,
  ACTIVITY_LEVEL_LABEL, MACRO_PRESET_LABEL,
  type Sex, type ActivityLevel, type BmiCategory, type MacroPreset,
} from '@ava/domain';

const CAT_CLASS: Record<BmiCategory, string> = {
  sangat_kurus: 'pill--segera', kurus: 'pill--perhatian', normal: 'pill--normal',
  gemuk: 'pill--perhatian', obesitas: 'pill--segera',
};
const LEVELS: ActivityLevel[] = ['sedentary', 'ringan', 'sedang', 'aktif', 'sangat_aktif'];
const PRESETS: MacroPreset[] = ['seimbang', 'tinggi_protein', 'rendah_karbo'];
const num = (s: string) => { const n = Number(s); return Number.isFinite(n) && n > 0 ? n : 0; };

export interface CalcInitial { beratKg?: number | null; tinggiCm?: number | null; usia?: number | null; sex?: Sex | null; }

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

export function WellnessCalculators({ initial }: { initial?: CalcInitial }) {
  const [berat, setBerat] = useState(initial?.beratKg ? String(initial.beratKg) : '');
  const [tinggi, setTinggi] = useState(initial?.tinggiCm ? String(initial.tinggiCm) : '');
  const [usia, setUsia] = useState(initial?.usia ? String(initial.usia) : '');
  const [sex, setSex] = useState<Sex>(initial?.sex ?? 'pria');
  const [level, setLevel] = useState<ActivityLevel>('sedang');
  const [aktivitas, setAktivitas] = useState('lari_sedang');
  const [durasi, setDurasi] = useState('');
  const [targetKg, setTargetKg] = useState('');
  const [preset, setPreset] = useState<MacroPreset>('seimbang');
  const [langkah, setLangkah] = useState('');

  const activities = useMemo(() => listActivities(), []);
  const w = num(berat), h = num(tinggi), a = num(usia), d = num(durasi), tk = num(targetKg), st = num(langkah);

  const bmi = w && h ? calcBmi(w, h) : null;
  const bmr = w && h && a ? calcBmr(sex, w, h, a) : null;
  const tdee = bmr ? calcTdee(bmr, level) : null;
  const air = w ? dailyWaterMl(w) : null;
  const kalOlahraga = w && d ? activityCalories(aktivitas, w, d) : null;
  const plan = w && tk ? targetWeightPlan(w, tk) : null;
  const mac = tdee ? macros(tdee, preset) : null;
  const jarak = st && h ? stepsToDistanceKm(st, h) : null;
  const kalLangkah = st && w ? stepsCalories(st, w) : null;

  const prefilled = !!(initial?.beratKg || initial?.tinggiCm);

  return (
    <>
      <div className="section-h">Alat &amp; kalkulator</div>
      <p style={{ fontSize: 13, color: 'var(--ava-color-ink-500)', margin: '0 0 12px' }}>
        {prefilled ? 'Terisi otomatis dari profilmu — tinggal lihat hasilnya. ' : 'Tinggal isi data — langsung terhitung. '}
        Estimasi edukatif dengan rumus baku, bukan penilaian medis.
      </p>

      {/* Profil singkat */}
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
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Stat label="IMT" value={bmi.bmi.toFixed(1)} />
            <Stat label="Berat sehat" value={`${bmi.healthyMin}–${bmi.healthyMax}`} sub="kg untuk tinggimu" />
            {air && <Stat label="Air/hari" value={`${(air / 1000).toFixed(1)} L`} sub="≈ anjuran" />}
          </div>
        ) : <div className="hint" style={{ marginTop: 8 }}>Isi berat &amp; tinggi untuk melihat IMT.</div>}
      </div>

      {/* Kebutuhan kalori + makro */}
      <div className="card">
        <strong style={{ color: 'var(--ava-color-ink-900)' }}>Kebutuhan kalori &amp; makro</strong>
        {tdee ? (
          <>
            <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
              <Stat label="BMR" value={`${bmr}`} sub="kal istirahat" />
              <Stat label="Kebutuhan" value={`${tdee}`} sub="kal/hari" />
            </div>
            <Field label="Pola makro">
              <select className="select" value={preset} onChange={(e) => setPreset(e.target.value as MacroPreset)}>
                {PRESETS.map((p) => <option key={p} value={p}>{MACRO_PRESET_LABEL[p]}</option>)}
              </select>
            </Field>
            {mac && (
              <div style={{ display: 'flex', gap: 8 }}>
                <Stat label="Protein" value={`${mac.proteinG} g`} />
                <Stat label="Karbo" value={`${mac.carbG} g`} />
                <Stat label="Lemak" value={`${mac.fatG} g`} />
              </div>
            )}
          </>
        ) : <div className="hint" style={{ marginTop: 8 }}>Isi berat, tinggi &amp; usia untuk estimasi kalori.</div>}
      </div>

      {/* Target berat */}
      <div className="card">
        <strong style={{ color: 'var(--ava-color-ink-900)' }}>Rencana target berat</strong>
        <Field label="Target berat (kg)"><input className="input" type="number" inputMode="decimal" value={targetKg} onChange={(e) => setTargetKg(e.target.value)} placeholder="mis. 60" /></Field>
        {plan ? (
          plan.direction === 'jaga' ? (
            <div className="note note--ok">Kamu sudah di berat target — pertahankan!</div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <Stat label={plan.direction === 'turun' ? 'Perlu turun' : 'Perlu naik'} value={`${plan.totalKg} kg`} />
              <Stat label="Perkiraan" value={`${plan.weeks} mgg`} sub="laju aman 0.5 kg/mgg" />
              <Stat label={plan.dailyCalAdjust < 0 ? 'Defisit' : 'Surplus'} value={`${Math.abs(plan.dailyCalAdjust)}`} sub="kal/hari" />
            </div>
          )
        ) : <div className="hint" style={{ marginTop: 8 }}>Isi berat (di atas) &amp; target untuk lihat rencananya.</div>}
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
          <div style={{ display: 'flex', gap: 8 }}><Stat label="Perkiraan" value={`${kalOlahraga} kal`} sub="terbakar" /></div>
        ) : <div className="hint">Isi berat (di atas) &amp; durasi untuk perkiraan kalori.</div>}
      </div>

      {/* Langkah → jarak & kalori */}
      <div className="card">
        <strong style={{ color: 'var(--ava-color-ink-900)' }}>Langkah → jarak &amp; kalori</strong>
        <Field label="Jumlah langkah"><input className="input" type="number" inputMode="numeric" value={langkah} onChange={(e) => setLangkah(e.target.value)} placeholder="mis. 10000" /></Field>
        {jarak != null || kalLangkah != null ? (
          <div style={{ display: 'flex', gap: 8 }}>
            {jarak != null && <Stat label="Jarak" value={`${jarak} km`} />}
            {kalLangkah != null && <Stat label="Kalori" value={`${kalLangkah} kal`} />}
          </div>
        ) : <div className="hint">Isi jumlah langkah (butuh tinggi &amp; berat di atas).</div>}
      </div>
    </>
  );
}
