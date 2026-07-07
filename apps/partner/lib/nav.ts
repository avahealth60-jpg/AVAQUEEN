// apps/partner/lib/nav.ts — seksi navigasi per peran (hanya route yang ADA).
export interface PartnerSection { href: string; label: string; }

export function partnerSections(role: string | null, orgKind?: string | null): PartnerSection[] {
  if (role === 'vendor') {
    return [
      { href: '/', label: 'Armada' },
      { href: '/toko', label: 'Toko & pesanan' },
      { href: '/jadwal', label: 'Jadwal kalibrasi' },
    ];
  }
  if (role === 'lab') {
    return [
      { href: '/', label: 'Kalibrasi' },
      { href: '/riwayat', label: 'Riwayat' },
      { href: '/badge', label: 'Badge' },
    ];
  }
  if (role === 'doctor') {
    return [
      { href: '/', label: 'Konsultasi' },
      { href: '/riwayat', label: 'Riwayat & pendapatan' },
      { href: '/faskes', label: 'Faskes' },
    ];
  }
  // employer / faskes admin: dashboard tunggal, tanpa sub-menu.
  void orgKind;
  return [];
}
