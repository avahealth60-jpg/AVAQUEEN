'use client';
// apps/customer/components/WellnessCard.tsx — satu program wellness + progres.
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { enrollWellness, leaveWellness, checkinWellness, logActivity } from '../app/actions';
import type { ProgramCard } from '../lib/data';

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  achieved: { label: 'Tercapai', bg: 'var(--normal-bg)', fg: 'var(--normal)' },
  on_track: { label: 'Menuju target', bg: 'var(--perhatian-bg)', fg: 'var(--perhatian)' },
  behind: { label: 'Perlu dorongan', bg: 'var(--ava-color-surface-1, #f4f4f5)', fg: 'var(--ava-color-ink-500)' },
};

function ProgressBar({ percent, status }: { percent: number; status: string }) {
  const color = status === 'achieved' ? 'var(--normal)' : status === 'on_track' ? 'var(--perhatian)' : 'var(--brand)';
  return (
    <div style={{ height: 8, background: 'var(--ava-color-line)', borderRadius: 999, overflow: 'hidden', marginTop: 8 }}>
      <div style={{ width: `${percent}%`, height: '100%', background: color, borderRadius: 999, transition: 'width .3s' }} />
    </div>
  );
}

function DailyBars({ daily, target }: { daily: { date: string; value: number }[]; target: number }) {
  if (daily.length < 2) return null;
  const max = Math.max(target, ...daily.map((d) => d.value)) || 1;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 44, position: 'relative' }}>
        {/* garis target */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${(target / max) * 100}%`, borderTop: '1px dashed var(--ava-color-trust-300)' }} />
        {daily.map((d, i) => {
          const met = d.value >= target;
          return (
            <div key={i} title={`${d.date}: ${d.value.toLocaleString('id-ID')}`}
              style={{
                flex: 1, height: `${Math.max(4, (d.value / max) * 100)}%`, borderRadius: 3,
                background: met ? 'var(--normal)' : 'var(--ava-color-line-strong, #cbd5e1)',
              }} />
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: 'var(--ava-color-ink-500)', marginTop: 4 }}>
        {daily.length} hari terakhir · garis putus = target
      </div>
    </div>
  );
}

export function WellnessCard({ card }: { card: ProgramCard }) {
  const { program, enrolled, summary, todayCheckin, daily, metToday } = card;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);

  const isManual = program.metric === 'hydration_ml' || program.metric === 'checkin';

  async function run(fn: () => Promise<{ ok: boolean; message: string }>) {
    setBusy(true); setNote(null);
    const r = await fn();
    setNote({ kind: r.ok ? 'ok' : 'bad', text: r.message });
    if (r.ok) router.refresh();
    setBusy(false);
  }

  const st = summary ? STATUS[summary.status] ?? STATUS.behind : null;

  // Konfigurasi input pemicu per jenis metrik program.
  const inputCfg: { unit: string; placeholder: string; button: string; hint: string; submit: (v: number) => Promise<{ ok: boolean; message: string }> } =
    isManual
      ? {
          unit: program.unit, placeholder: `Tambah ${program.unit}`, button: 'Catat',
          hint: 'Belum check-in hari ini — yuk catat sekarang.',
          submit: (v) => checkinWellness(program.code, v),
        }
      : program.metric === 'sleep_minutes'
        ? {
            unit: 'jam', placeholder: 'Tidur tadi malam (jam)', button: 'Catat tidur',
            hint: 'Belum catat tidur hari ini — berapa jam tadi malam?',
            submit: (v) => logActivity('sleep_minutes', Math.round(v * 60)),
          }
        : program.metric === 'active_minutes'
          ? {
              unit: 'menit', placeholder: 'Menit aktif hari ini', button: 'Catat',
              hint: 'Target menit aktif belum tercapai — catat aktivitasmu.',
              submit: (v) => logActivity('active_minutes', v),
            }
          : { // steps (default gaya hidup)
              unit: 'langkah', placeholder: 'Langkah hari ini', button: 'Catat',
              hint: 'Target langkah belum tercapai — catat progresmu.',
              submit: (v) => logActivity('steps', v),
            };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--ava-color-ink-900)' }}>{program.title}</div>
          <div style={{ fontSize: 13, color: 'var(--ava-color-ink-500)', marginTop: 2 }}>{program.description}</div>
        </div>
        {enrolled && st && (
          <span className="pill" style={{ background: st.bg, color: st.fg, whiteSpace: 'nowrap' }}>{st.label}</span>
        )}
      </div>

      {enrolled && summary ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--ava-color-ink-500)' }}>
              Hari ini: <strong style={{ color: 'var(--ava-color-ink-900)' }}>{summary.latest.toLocaleString('id-ID')}</strong>
              {' / '}{program.dailyTarget.toLocaleString('id-ID')} {program.unit}
            </span>
            <span style={{ fontSize: 13, color: 'var(--ava-color-trust-600)' }}>🔥 {summary.streak} hari</span>
          </div>
          <ProgressBar percent={summary.percentToday} status={summary.status} />
          <div style={{ fontSize: 12, color: 'var(--ava-color-ink-500)', marginTop: 6 }}>
            {summary.daysMetTarget} dari {summary.totalDays} hari memenuhi target · rekor {summary.bestStreak} hari
          </div>

          <DailyBars daily={daily} target={program.dailyTarget} />

          {!metToday && (
            <div className="note" style={{ background: 'var(--brand-bg)', color: 'var(--brand-ink)', marginTop: 10 }}>
              {inputCfg.hint}
            </div>
          )}

          {/* Setiap program aktif punya input pemicu: manual (check-in) atau
              gaya hidup (langkah/tidur/menit aktif → logActivity). */}
          <div className="row2" style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <div className="suffix" style={{ flex: 1 }}>
              <input
                className="input" type="number" inputMode="decimal" placeholder={inputCfg.placeholder}
                value={amount} onChange={(e) => setAmount(e.target.value)}
              />
              <span className="unit">{inputCfg.unit}</span>
            </div>
            <button
              className="btn" disabled={busy || !amount}
              onClick={() => { const v = Number(amount); setAmount(''); run(() => inputCfg.submit(v)); }}
            >
              {inputCfg.button}
            </button>
          </div>

          <button className="btn btn--ghost" style={{ marginTop: 10 }} disabled={busy}
            onClick={() => run(() => leaveWellness(program.code))}>
            Berhenti
          </button>
        </>
      ) : (
        <button className="btn" style={{ marginTop: 12 }} disabled={busy}
          onClick={() => run(() => enrollWellness(program.code))}>
          {busy ? 'Memproses…' : 'Ikuti program'}
        </button>
      )}

      {note && <div className={`note note--${note.kind}`}>{note.text}</div>}
    </div>
  );
}
