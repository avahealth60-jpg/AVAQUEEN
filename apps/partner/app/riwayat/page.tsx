import React from 'react';
import { getPartnerAuth } from '../../lib/auth';
import { LabHistory } from '../../components/LabDashboard';
import { DoctorHistory } from '../../components/DoctorDashboard';
import { PageHead, ConnBanner, Empty } from '../../components/widgets';

export const dynamic = 'force-dynamic';

export default async function RiwayatPage() {
  const auth = await getPartnerAuth();
  if (!auth.configured) return <div className="wrap"><ConnBanner /></div>;
  if (auth.role === 'lab') return <div className="wrap"><LabHistory /></div>;
  if (auth.role === 'doctor') return <div className="wrap"><DoctorHistory /></div>;
  return (
    <div className="wrap">
      <PageHead eyebrow="Mitra" title="Tak tersedia" sub="" />
      <div className="card"><Empty title="Seksi ini untuk lab / dokter" hint="Peranmu tidak memiliki riwayat di sini." /></div>
    </div>
  );
}
