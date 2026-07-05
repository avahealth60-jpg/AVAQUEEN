// apps/admin/lib/apps.ts — target "Buka sebagai" untuk Super Admin.
// URL tiap app diatur via env di Vercel (deployment terpisah). Fallback lokal
// untuk dev. Karena dipakai komponen klien, pakai prefix NEXT_PUBLIC_.
const CUSTOMER_URL = process.env.NEXT_PUBLIC_CUSTOMER_URL || 'http://localhost:3000';
const PARTNER_URL = process.env.NEXT_PUBLIC_PARTNER_URL || 'http://localhost:3002';

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
