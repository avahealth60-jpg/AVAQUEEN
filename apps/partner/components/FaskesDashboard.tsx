// Server component — dashboard faskes: dokter + agregat operasional (bukan data pasien).
import React from 'react';
import { faskesSummary, faskesDoctors, faskesJoinCode } from '../lib/corporate';
import { setFaskesJoinCode } from '../app/actions';
import { PageHead, Empty } from './widgets';
import { JoinCodeForm } from './JoinCodeForm';
import type { PartnerOrg } from '../lib/auth';

const rupiah = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

export async function FaskesDashboard({ org }: { org: PartnerOrg }) {
  const [s, docs, code] = await Promise.all([faskesSummary(org.id), faskesDoctors(org.id), faskesJoinCode(org.id)]);

  return (
    <>
      <PageHead eyebrow="Faskes" title={`Fasilitas · ${org.name}`}
        sub="Kelola dokter & lihat ringkasan operasional. AVA tidak membuka data kesehatan pasien." />

      <div className="tiles">
        <div className="tile"><div className="tile__label">Dokter</div><div className="tile__num">{s?.doctors ?? 0}</div></div>
        <div className="tile"><div className="tile__label">Konsultasi</div><div className="tile__num">{s?.consultations ?? 0}</div></div>
        <div className="tile"><div className="tile__label">Selesai</div><div className="tile__num">{s?.completed ?? 0}</div></div>
        <div className="tile"><div className="tile__label">Rating rata-rata</div><div className="tile__num">{s?.avgRating ? `★ ${s.avgRating.toFixed(1)}` : '—'}</div></div>
        <div className="tile"><div className="tile__label">Pendapatan kotor</div><div className="tile__num" style={{ fontSize: 20 }}>{rupiah(s?.gross ?? 0)}</div></div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="card__title">Dokter di faskes</div>
          {docs.length === 0 ? (
            <Empty title="Belum ada dokter" hint="Bagikan kode gabung agar dokter bergabung." />
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Nama</th><th>Peran</th></tr></thead>
                <tbody>{docs.map((d) => <tr key={d.id}><td>{d.name}</td><td>Dokter</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
        <div className="card">
          <div className="card__title">Kode gabung dokter</div>
          <p className="hint" style={{ marginBottom: 8 }}>Bagikan ke dokter agar bergabung ke faskes ini.</p>
          <JoinCodeForm current={code} action={setFaskesJoinCode} />
        </div>
      </div>

      <p className="hint" style={{ marginTop: 16 }}>
        Privasi: ringkasan di atas bersifat operasional (jumlah & agregat). Isi
        konsultasi dan hasil pemeriksaan pasien tetap tertutup bagi admin faskes.
      </p>
    </>
  );
}
