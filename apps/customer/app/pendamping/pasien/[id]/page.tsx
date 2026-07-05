// apps/customer/app/pendamping/pasien/[id]/page.tsx
// Tampilan read-only hasil pasien untuk pendamping. RLS menegakkan hak akses:
// bila penonton bukan pendamping aktif dengan scope 'readings', daftar kosong.
import React from 'react';
import Link from 'next/link';
import { getCustomerAuth } from '../../../../lib/auth';
import { patientReadings } from '../../../../lib/data';
import { ConnBanner } from '../../../../components/ConnBanner';
import { TriagePill } from '../../../../components/widgets';

export const dynamic = 'force-dynamic';

function fmt(ts: string) {
  return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function PatientView({ params }: { params: { id: string } }) {
  const { configured } = await getCustomerAuth();
  if (!configured) return <div className="screen"><ConnBanner /></div>;

  const rows = await patientReadings(params.id);

  return (
    <div className="screen">
      <header style={{ marginBottom: 'var(--ava-space-5)' }}>
        <p style={{
          fontFamily: 'var(--ava-font-mono)', fontSize: 'var(--ava-text-xs)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--ava-color-trust-600)', margin: 0,
        }}>
          Pendamping · hanya-baca
        </p>
        <h1 style={{
          fontFamily: 'var(--ava-font-display)', fontSize: 'var(--ava-text-2xl)',
          fontWeight: 600, color: 'var(--ava-color-ink-900)', margin: '4px 0 0',
        }}>
          Hasil pasien
        </h1>
      </header>

      {rows.length === 0 ? (
        <div className="card">
          <div className="empty">
            <strong>Tidak ada data</strong>
            Belum ada hasil, atau aksesmu sudah dicabut.
          </div>
        </div>
      ) : (
        <div className="card">
          {rows.map((r) => (
            <div className="read" key={r.id}>
              <div className="read__main">
                <div className="read__label">{r.label}</div>
                <div className="read__meta">{fmt(r.takenAt)}</div>
              </div>
              <div className="read__val">{r.display}<span className="read__unit">{r.unit}</span></div>
              <TriagePill triage={r.triage} />
            </div>
          ))}
        </div>
      )}

      <p style={{ marginTop: 16 }}>
        <Link className="btn btn--ghost" href="/pendamping" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
          Kembali
        </Link>
      </p>
    </div>
  );
}
