// apps/admin/lib/apps.ts — target "Buka sebagai" untuk Super Admin.
// Default = deployment PRODUKSI Vercel. Bisa dioverride via env (mis. untuk dev
// lokal set NEXT_PUBLIC_CUSTOMER_URL=http://localhost:3000). Prefix NEXT_PUBLIC_
// karena dipakai komponen klien.
const CUSTOMER_URL = process.env.NEXT_PUBLIC_CUSTOMER_URL || 'https://avaqueen-customer.vercel.app';
const PARTNER_URL = process.env.NEXT_PUBLIC_PARTNER_URL || 'https://avaqueen-partner.vercel.app';

export interface AppTarget {
  key: string;
  label: string;
  desc: string;
  url: string;
  external: boolean;
}

export const ROLE_TARGETS: AppTarget[] = [
  { key: 'customer', label: 'Web Customer', desc: 'App masyarakat (pasien)', url: CUSTOMER_URL, external: true },
  { key: 'partner', label: 'Web Partner', desc: 'Vendor · Lab · Dokter · Pemberi kerja', url: PARTNER_URL, external: true },
  { key: 'inspektur', label: 'Inspektur Peran', desc: 'Lihat data tiap peran (read-only)', url: '/inspektur', external: false },
];
