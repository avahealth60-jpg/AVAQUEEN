import React from 'react';
import { getPartnerAuth } from '../../lib/auth';
import { VendorShop } from '../../components/VendorDashboard';
import { PageHead, ConnBanner, Empty } from '../../components/widgets';

export const dynamic = 'force-dynamic';

export default async function TokoPage() {
  const auth = await getPartnerAuth();
  if (!auth.configured) return <div className="wrap"><ConnBanner /></div>;
  if (auth.role !== 'vendor') {
    return (
      <div className="wrap">
        <PageHead eyebrow="Mitra" title="Tak tersedia" sub="" />
        <div className="card"><Empty title="Seksi ini untuk vendor" hint="Peranmu tidak memiliki toko." /></div>
      </div>
    );
  }
  return <div className="wrap"><VendorShop /></div>;
}
