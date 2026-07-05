// Server component — dashboard pemberi kerja: HANYA agregat teranonimkan.
import React from 'react';
import { employerSummary, employerJoinCode } from '../lib/corporate';
import { PageHead, Empty } from './widgets';
import { JoinCodeForm } from './JoinCodeForm';
import type { PartnerOrg } from '../lib/auth';

export async function EmployerDashboard({ org }: { org: PartnerOrg }) {
  const [s, joinCode] = await Promise.all([employerSummary(org.id), employerJoinCode(org.id)]);

  return (
    <>
      <PageHead eyebrow="Pemberi kerja" title={`Wellness · ${org.name}`}
        sub="Ringkasan partisipasi karyawan — teranonimkan. AVA tidak pernah membuka data kesehatan individu." />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card__title">Kode gabung</div>
        <p className="hint" style={{ marginBottom: 8 }}>Bagikan kode ini ke karyawan agar mereka bergabung dari aplikasi AVA mereka.</p>
        <JoinCodeForm current={joinCode} />
      </div>

      {!s ? (
        <div className="card"><Empty title="Belum ada data" hint="Ringkasan muncul setelah karyawan bergabung." /></div>
      ) : s.suppressed ? (
        <div className="card">
          <div className="card__title">Ringkasan partisipasi</div>
          <Empty
            title="Data disembunyikan"
            hint={`Peserta masih terlalu sedikit (${s.participants}) untuk ditampilkan tanpa membahayakan privasi. Minimal 5 peserta.`} />
        </div>
      ) : (
        <div className="tiles">
          <div className="tile"><div className="tile__label">Karyawan tergabung</div><div className="tile__num">{s.participants}</div></div>
          <div className="tile"><div className="tile__label">Aktif di wellness</div><div className="tile__num">{s.activeWellness}</div></div>
          <div className="tile"><div className="tile__label">Tingkat partisipasi</div><div className="tile__num">{s.rate}%</div></div>
        </div>
      )}

      <p className="hint" style={{ marginTop: 16 }}>
        Privasi: angka di atas adalah agregat dengan ambang k-anonimitas.
        Pemberi kerja tidak dapat melihat hasil pemeriksaan, program, atau
        identitas kesehatan karyawan mana pun.
      </p>
    </>
  );
}
