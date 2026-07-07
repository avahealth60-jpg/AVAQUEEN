import React from 'react';
import { getPartnerAuth } from '../../lib/auth';
import { LabBadges } from '../../components/LabDashboard';
import { PageHead, ConnBanner, Empty } from '../../components/widgets';

export const dynamic = 'force-dynamic';

export default async function BadgePage() {
  const auth = await getPartnerAuth();
  if (!auth.configured) return <div className="wrap"><ConnBanner /></div>;
  if (auth.role !== 'lab') {
    return (
      <div className="wrap">
        <PageHead eyebrow="Mitra" title="Tak tersedia" sub="" />
        <div className="card"><Empty title="Seksi ini untuk lab" hint="Peranmu tidak menerbitkan badge." /></div>
      </div>
    );
  }
  return <div className="wrap"><LabBadges /></div>;
}
