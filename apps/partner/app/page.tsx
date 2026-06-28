// apps/partner/app/page.tsx — router berbasis peran.
import React from 'react';
import { getPartnerAuth } from '../lib/auth';
import { VendorDashboard } from '../components/VendorDashboard';
import { LabDashboard } from '../components/LabDashboard';
import { DoctorDashboard } from '../components/DoctorDashboard';
import { PageHead, ConnBanner, Empty } from '../components/widgets';

export const dynamic = 'force-dynamic';

export default async function PartnerHome() {
  const auth = await getPartnerAuth();

  if (!auth.configured) {
    return (<div className="wrap"><ConnBanner /></div>);
  }
  if (auth.role === 'vendor') return <div className="wrap"><VendorDashboard orgName={auth.org?.name ?? null} /></div>;
  if (auth.role === 'lab') return <div className="wrap"><LabDashboard orgName={auth.org?.name ?? null} /></div>;
  if (auth.role === 'doctor') return <div className="wrap"><DoctorDashboard name={auth.email} /></div>;

  // faskes_admin — modul faskes menyusul.
  return (
    <div className="wrap">
      <PageHead eyebrow="Mitra" title="Portal mitra"
        sub="Akun ini belum punya modul aktif di portal ini." />
      <div className="card">
        <Empty
          title="Modul faskes & dokter menyusul"
          hint="Alur konsultasi (jadwal, ruang konsul, komisi) dibuka pada fase berikutnya. Untuk vendor & lab, modul QC sudah aktif." />
      </div>
    </div>
  );
}
