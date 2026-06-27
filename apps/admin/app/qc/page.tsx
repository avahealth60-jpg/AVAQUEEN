// apps/admin/app/qc/page.tsx — Monitoring QC (wedge): seluruh armada + status.
import React from 'react';
import { fleet, isConfigured } from '../../lib/data';
import { deriveAll } from '../../lib/derive';
import { PageHead, ConnBanner } from '../../components/widgets';
import { QcTable } from '../../components/QcTable';

export const dynamic = 'force-dynamic';

export default async function QcPage() {
  const now = new Date();
  const rows = deriveAll(await fleet(), now);
  return (
    <>
      <PageHead
        eyebrow="Operasi · Monitoring QC"
        title="Status QC armada"
        sub="Status kalibrasi, hasil QC, dan badge AVA Verified per alat. Status dihitung dari logika domain teruji."
      />
      {!isConfigured() && <ConnBanner />}
      <QcTable rows={rows} />
    </>
  );
}
