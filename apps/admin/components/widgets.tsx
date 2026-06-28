// apps/admin/components/widgets.tsx
// Atom presentasional bersama (tanpa state) — dipakai lintas halaman admin.
import React from 'react';
import type { QcResult, CalibrationReminderStatus } from '@ava/domain';

export function QcTag({ qc }: { qc: QcResult | null }) {
  if (!qc) return <span className="pill pill--mute"><span className="dot dot--mute" />Belum QC</span>;
  const map: Record<QcResult, [string, string]> = {
    lulus: ['pill--ok', 'Lulus'],
    perlu_tinjau: ['pill--warn', 'Perlu tinjau'],
    gagal: ['pill--bad', 'Gagal'],
  };
  const dot: Record<QcResult, string> = { lulus: 'dot--ok', perlu_tinjau: 'dot--warn', gagal: 'dot--bad' };
  const [cls, label] = map[qc];
  return <span className={`pill ${cls}`}><span className={`dot ${dot[qc]}`} />{label}</span>;
}

export function DueTag({
  status, date,
}: { status: CalibrationReminderStatus | null; date: string | null }) {
  if (!date || !status) return <span className="mono" style={{ color: 'var(--muted)' }}>—</span>;
  const map: Record<CalibrationReminderStatus, [string, string]> = {
    ok: ['', date],
    due_soon: ['pill pill--warn', `${date} · segera`],
    overdue: ['pill pill--bad', `${date} · lewat`],
  };
  const [cls, label] = map[status];
  return cls
    ? <span className={cls}>{label}</span>
    : <span className="mono">{label}</span>;
}

export function BadgeTag({ active }: { active: boolean }) {
  return active
    ? <span className="pill pill--ok"><span className="dot dot--ok" />AVA Verified</span>
    : <span className="pill pill--mute"><span className="dot dot--mute" />Tidak aktif</span>;
}

export function KindTag({ kind }: { kind: 'vendor' | 'lab' | 'faskes' }) {
  const label = { vendor: 'Vendor', lab: 'Lab kalibrasi', faskes: 'Faskes' }[kind];
  return <span className={`kind kind--${kind}`}>{label}</span>;
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
      <div>
        <strong>Supabase belum tersambung.</strong> Menampilkan keadaan kosong. Set{' '}
        <code>SUPABASE_URL</code> dan <code>SUPABASE_SERVICE_ROLE_KEY</code> di{' '}
        <code>apps/admin/.env.local</code>, lalu jalankan ulang. Konsol ini membaca lewat
        service-role di sisi server — taruh di belakang autentikasi sebelum deploy.
      </div>
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint: string }) {
  return <div className="empty"><strong>{title}</strong>{hint}</div>;
}

export function NotAuthorized({ email, signOut }: { email: string | null; signOut: React.ReactNode }) {
  return (
    <div className="login">
      <div className="login__mark" style={{ background: 'var(--bad)' }}>!</div>
      <h1 className="login__title">Akses ditolak</h1>
      <p className="login__sub">
        Akun {email ? <strong>{email}</strong> : 'ini'} tidak memiliki peran <code>ava_admin</code>.
        Hubungi admin AVA untuk dipromosikan, lalu masuk kembali.
      </p>
      {signOut}
    </div>
  );
}
