// apps/admin/app/konfigurasi/page.tsx — Aturan yang mengatur mesin (read-only v1).
import React from 'react';
import { EDUCATIONAL_DISCLAIMER } from '@ava/domain';
import { PageHead } from '../../components/widgets';

export const dynamic = 'force-dynamic';

export default function KonfigurasiPage() {
  return (
    <>
      <PageHead
        eyebrow="Tata kelola · Konfigurasi"
        title="Aturan mesin"
        sub="Parameter yang mengatur QC, badge, dan lapisan AI. Versi ini menampilkan; pengeditan menyusul."
      />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card__title">Kalibrasi & badge</div>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '220px 1fr', rowGap: 10, fontSize: 14 }}>
          <dt style={{ color: 'var(--muted)' }}>Interval kalibrasi default</dt><dd style={{ margin: 0 }} className="mono">12 bulan (per model alat)</dd>
          <dt style={{ color: 'var(--muted)' }}>Jendela "segera"</dt><dd style={{ margin: 0 }} className="mono">30 hari sebelum jatuh tempo</dd>
          <dt style={{ color: 'var(--muted)' }}>Syarat terbit badge</dt><dd style={{ margin: 0 }}>QC harus <strong>lulus</strong> (perlu_tinjau/gagal ditolak)</dd>
          <dt style={{ color: 'var(--muted)' }}>Masa berlaku badge</dt><dd style={{ margin: 0 }} className="mono">= interval kalibrasi alat</dd>
        </dl>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card__title">Lapisan AI (terkunci edukatif)</div>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: '0 0 10px' }}>
          Output AI dikunci non-diagnostik di level skema: <code className="mono">is_educational = true</code> +{' '}
          <code className="mono">disclaimer</code> wajib. Triase dihitung deterministik; LLM hanya menerjemahkan.
        </p>
        <div style={{ background: '#FBFCFD', border: '1px solid var(--line)', borderRadius: 8, padding: 12, fontSize: 13, color: 'var(--ink-2)' }}>
          “{EDUCATIONAL_DISCLAIMER}”
        </div>
      </div>

      <div className="banner" role="note">
        <span aria-hidden>⚠️</span>
        <div>Rentang rujukan klinis (<code>packages/domain/reference-range.ts</code>) adalah nilai
          edukatif placeholder dan <strong>wajib ditandatangani klinisi berlisensi</strong> sebelum tayang produksi.</div>
      </div>
    </>
  );
}
