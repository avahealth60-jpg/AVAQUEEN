// apps/admin/app/keuangan/page.tsx — Keuangan: basis tagih QC (proyeksi).
// Catatan: penagihan nyata menyusul saat integrasi payment (Midtrans/Xendit).
// Angka di bawah adalah PROYEKSI dari basis alat ber-QC × tarif placeholder.
import React from 'react';
import { fleet, partners, isConfigured } from '../../lib/data';
import { commissionStats } from '../../lib/data';
import { PageHead, ConnBanner } from '../../components/widgets';

export const dynamic = 'force-dynamic';

const TARIF_QC_PER_ALAT = 75000; // placeholder IDR/alat/tahun — atur di Konfigurasi
const rupiah = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

export default async function KeuanganPage() {
  const [rows, mitra, komisi] = await Promise.all([fleet(), partners(), commissionStats()]);
  const billable = rows.filter((r) => r.qc !== null).length;
  const proyeksiTahunan = billable * TARIF_QC_PER_ALAT;
  const vendors = mitra.filter((m) => m.kind === 'vendor').length;

  return (
    <>
      <PageHead
        eyebrow="Tata kelola · Keuangan"
        title="Pendapatan QC"
        sub="Mesin QC adalah wedge pendapatan utama. Penagihan riil menyusul saat payment provider terpasang."
      />
      {!isConfigured() && <ConnBanner />}

      <div className="banner" role="note" style={{ borderColor: '#BFDBFE', background: '#EFF6FF', color: '#1E40AF' }}>
        <span aria-hidden>ℹ️</span>
        <div>Angka di bawah adalah <strong>proyeksi</strong> berbasis alat ber-QC × tarif placeholder
          (<code>{rupiah(TARIF_QC_PER_ALAT)}</code>/alat/tahun). Invoice & rekonsiliasi nyata aktif setelah Midtrans/Xendit tersambung.</div>
      </div>

      <div className="tiles">
        <div className="tile"><div className="tile__label">Alat ber-QC (basis tagih)</div><div className="tile__num">{billable}</div><div className="tile__foot">dari {rows.length} alat</div></div>
        <div className="tile"><div className="tile__label">Vendor berkontrak</div><div className="tile__num">{vendors}</div></div>
        <div className="tile"><div className="tile__label">Proyeksi/tahun</div><div className="tile__num" style={{ fontSize: 22 }}>{rupiah(proyeksiTahunan)}</div></div>
        <div className="tile"><div className="tile__label">Proyeksi/bulan</div><div className="tile__num" style={{ fontSize: 22 }}>{rupiah(Math.round(proyeksiTahunan / 12))}</div></div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card__title">Pendapatan konsultasi (komisi AVA, aktual)</div>
        <div className="tiles" style={{ marginBottom: 0 }}>
          <div className="tile"><div className="tile__label">Konsultasi selesai</div><div className="tile__num">{komisi.count}</div></div>
          <div className="tile"><div className="tile__label">Nilai transaksi</div><div className="tile__num" style={{ fontSize: 22 }}>{rupiah(komisi.gross)}</div></div>
          <div className="tile"><div className="tile__label">Komisi AVA (15%)</div><div className="tile__num" style={{ fontSize: 22 }}>{rupiah(komisi.avaRevenue)}</div></div>
          <div className="tile"><div className="tile__label">Rata-rata/konsultasi</div><div className="tile__num" style={{ fontSize: 22 }}>{komisi.count ? rupiah(Math.round(komisi.avaRevenue / komisi.count)) : 'Rp 0'}</div></div>
        </div>
      </div>

      <div className="card">
        <div className="card__title">Pendapatan per vendor (proyeksi)</div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Vendor</th><th>Alat</th><th>Proyeksi/tahun</th></tr></thead>
            <tbody>
              {mitra.filter((m) => m.kind === 'vendor').map((v) => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 600 }}>{v.name}</td>
                  <td className="mono">{v.deviceCount}</td>
                  <td className="mono">{rupiah(v.deviceCount * TARIF_QC_PER_ALAT)}</td>
                </tr>
              ))}
              {vendors === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>Belum ada vendor.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
