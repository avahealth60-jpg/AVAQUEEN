import React from 'react';
import { getPartnerAuth } from '../../lib/auth';
import { DoctorFaskes } from '../../components/DoctorDashboard';
import { PageHead, ConnBanner, Empty } from '../../components/widgets';

export const dynamic = 'force-dynamic';

export default async function FaskesPage() {
  const auth = await getPartnerAuth();
  if (!auth.configured) return <div className="wrap"><ConnBanner /></div>;
  if (auth.role !== 'doctor') {
    return (
      <div className="wrap">
        <PageHead eyebrow="Mitra" title="Tak tersedia" sub="" />
        <div className="card"><Empty title="Seksi ini untuk dokter" hint="Peranmu tidak bergabung ke faskes di sini." /></div>
      </div>
    );
  }
  return <div className="wrap"><DoctorFaskes /></div>;
}
