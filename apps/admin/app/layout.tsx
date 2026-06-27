// apps/admin/app/layout.tsx — shell konsol: rail + area utama.
import './globals.css';
import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { stats, isConfigured } from '../lib/data';

export const metadata = { title: 'AVA Admin · Konsol QC' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Hitung jumlah "perlu tindakan" untuk badge di rail (overdue + segera).
  let alertCount = 0;
  if (isConfigured()) {
    const s = await stats();
    alertCount = s.overdueCalibrations + s.dueSoonCalibrations;
  }
  return (
    <html lang="id">
      <body>
        <div className="shell">
          <Sidebar alertCount={alertCount} />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
