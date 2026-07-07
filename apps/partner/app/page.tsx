// apps/partner/app/page.tsx — router berbasis peran.
import React from 'react';
import { getPartnerAuth } from '../lib/auth';
import { VendorFleet } from '../components/VendorDashboard';
import { LabCalibrate } from '../components/LabDashboard';
import { DoctorConsults } from '../components/DoctorDashboard';
import { EmployerDashboard } from '../components/EmployerDashboard';
import { FaskesDashboard } from '../components/FaskesDashboard';
import { PageHead, ConnBanner, Empty } from '../components/widgets';

export const dynamic = 'force-dynamic';

export default async function PartnerHome() {
  const auth = await getPartnerAuth();

  if (!auth.configured) {
    return (<div className="wrap"><ConnBanner /></div>);
  }
  if (auth.role === 'vendor') return <div className="wrap"><VendorFleet orgName={auth.org?.name ?? null} /></div>;
  if (auth.role === 'lab') return <div className="wrap"><LabCalibrate orgName={auth.org?.name ?? null} /></div>;
  if (auth.role === 'doctor') return <div className="wrap"><DoctorConsults name={auth.email} /></div>;
  // Admin pemberi kerja / faskes dikenali dari jenis organisasinya.
  if (auth.org?.kind === 'employer') return <div className="wrap"><EmployerDashboard org={auth.org} /></div>;
  if (auth.org?.kind === 'faskes') return <div className="wrap"><FaskesDashboard org={auth.org} /></div>;

  // faskes_admin tanpa organisasi ter-set.
  return (
    <div className="wrap">
      <PageHead eyebrow="Mitra" title="Portal mitra"
        sub="Akunmu belum tertaut ke organisasi mana pun." />
      <div className="card">
        <Empty
          title="Belum ada organisasi"
          hint="Hubungi admin AVA untuk menautkan akunmu ke faskes/vendor/lab." />
      </div>
    </div>
  );
}
