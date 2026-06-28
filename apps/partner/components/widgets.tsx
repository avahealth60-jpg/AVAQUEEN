// apps/partner/components/widgets.tsx — atom presentasional.
import React from 'react';
import type { QcResult, CalibrationReminderStatus } from '@ava/domain';

export function QcTag({ qc }: { qc: QcResult | null }) {
  if (!qc) return <span className="pill pill--mute"><span className="dot dot--mute" />Belum QC</span>;
  const map: Record<QcResult, [string, string, string]> = {
    lulus: ['pill--ok', 'dot--ok', 'Lulus'],
    perlu_tinjau: ['pill--warn', 'dot--warn', 'Perlu tinjau'],
    gagal: ['pill--bad', 'dot--bad', 'Gagal'],
  };
  const [cls, dot, label] = map[qc];
  return <span className={`pill ${cls}`}><span className={`dot ${dot}`} />{label}</span>;
}

export function DueTag({ status, date }: { status: CalibrationReminderStatus | null; date: string | null }) {
  if (!date || !status) return <span className="mono" style={{ color: 'var(--muted)' }}>—</span>;
  const map: Record<CalibrationReminderStatus, [string, string]> = {
    ok: ['', date], due_soon: ['pill pill--warn', `${date} · segera`], overdue: ['pill pill--bad', `${date} · lewat`],
  };
  const [cls, label] = map[status];
  return cls ? <span className={cls}>{label}</span> : <span className="mono">{label}</span>;
}

export function BadgeTag({ active }: { active: boolean }) {
  return active
    ? <span className="pill pill--ok"><span className="dot dot--ok" />AVA Verified</span>
    : <span className="pill pill--mute"><span className="dot dot--mute" />Belum terverifikasi</span>;
}

export function PageHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <header className="page-head">
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p>{sub}</p>
    </header>
  );
}

export function ConnBanner() {
  return (
    <div className="banner" role="status">
      <span aria-hidden>⚠️</span>
      <div><strong>Supabase belum tersambung.</strong> Set <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{' '}
        <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di <code>apps/partner/.env.local</code>, lalu jalankan ulang.</div>
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint: string }) {
  return <div className="empty"><strong>{title}</strong>{hint}</div>;
}
