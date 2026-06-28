/**
 * AVA Health — Navigasi per Peran (V1.1.0)
 * Transkripsi langsung dari Blueprint V1.1 §02 (Peta navigasi per peran).
 * Penamaan aktif & konsisten ujung-ke-ujung.
 */
import type { RoleNav } from './types.js';

export const customerNav: RoleNav = {
  role: 'customer',
  roleLabel: 'Pendamping harian',
  tagline: 'Hasil pemeriksaan jadi pemahaman, lalu tindakan.',
  items: [
    { id: 'beranda', label: 'Beranda', href: '/', icon: 'Home', description: 'Ringkasan kesehatan & rekomendasi hari ini.' },
    { id: 'catat', label: 'Catat pemeriksaan', href: '/catat', icon: 'ClipboardPlus', description: 'Masukkan banyak parameter sekaligus lewat panel.' },
    { id: 'hasil', label: 'Hasil & evaluasi', href: '/hasil', icon: 'Activity', description: 'Evaluasi komprehensif: artinya, penyebab, saran.' },
    { id: 'riwayat', label: 'Riwayat & tren', href: '/riwayat', icon: 'TrendingUp', description: 'Lihat pola nilaimu dari waktu ke waktu.' },
    { id: 'konsultasi', label: 'Konsultasi', href: '/konsultasi', icon: 'Video', description: 'Telemedicine dengan dokter terverifikasi.' },
    { id: 'wellness', label: 'Wellness', href: '/wellness', icon: 'Sprout', description: 'Program & kebiasaan sehat harian.', isNew: true },
    { id: 'rewards', label: 'Rewards', href: '/rewards', icon: 'Gift', description: 'Voucher & mitra brand terkurasi.', isNew: true },
    { id: 'akun', label: 'Akun', href: '/akun', icon: 'UserCog', description: 'Kelola consent, data, dan profil.' },
  ],
};

export const vendorNav: RoleNav = {
  role: 'vendor',
  roleLabel: 'Manajemen armada',
  tagline: 'Alat terkalibrasi, badge terjaga.',
  items: [
    { id: 'armada', label: 'Dashboard armada', href: '/', icon: 'LayoutDashboard', description: 'Status seluruh unit dalam satu pandang.' },
    { id: 'daftar-alat', label: 'Daftarkan alat', href: '/alat/daftar', icon: 'PackagePlus', description: 'Tambah unit satuan atau massal via CSV.' },
    { id: 'qc-badge', label: 'Status QC & badge', href: '/qc', icon: 'BadgeCheck', description: 'Pantau QC dan badge per unit.' },
    { id: 'jadwal', label: 'Jadwal kalibrasi', href: '/jadwal', icon: 'CalendarClock', description: 'Unit yang menjelang jatuh tempo.' },
    { id: 'kontrak', label: 'Kontrak & tagihan QC', href: '/kontrak', icon: 'FileSpreadsheet', description: 'Kontrak QC dan tagihan B2B.' },
    { id: 'dokumen', label: 'Sertifikat & dokumen', href: '/dokumen', icon: 'FileCheck2', description: 'Arsip sertifikat kalibrasi dan dokumen.' },
  ],
};

export const labNav: RoleNav = {
  role: 'lab',
  roleLabel: 'Antrian & QC',
  tagline: 'Kalibrasi tercatat, badge terbit.',
  items: [
    { id: 'antrian', label: 'Antrian alat masuk', href: '/antrian', icon: 'Inbox', description: 'Unit yang menunggu kalibrasi.' },
    { id: 'catat-kalibrasi', label: 'Catat kalibrasi', href: '/catat-kalibrasi', icon: 'Ruler', description: 'Input kalibrasi + QC, unggah sertifikat.' },
    { id: 'riwayat', label: 'Riwayat hasil', href: '/riwayat', icon: 'History', description: 'Riwayat kalibrasi & hasil QC.' },
    { id: 'badge', label: 'Badge yang diterbitkan', href: '/badge', icon: 'BadgeCheck', description: 'Badge aktif dari hasil lulus.' },
    { id: 'ambang', label: 'Ambang & metrik QC', href: '/ambang', icon: 'SlidersHorizontal', description: 'Ambang kalibrasi dan metrik QC.' },
  ],
};

export const doctorNav: RoleNav = {
  role: 'doctor',
  roleLabel: 'Praktik telemedicine',
  tagline: 'Konsultasi yang ditindaklanjuti.',
  items: [
    { id: 'permintaan', label: 'Permintaan masuk', href: '/permintaan', icon: 'BellRing', description: 'Permintaan konsultasi menunggu konfirmasi.' },
    { id: 'jadwal', label: 'Jadwal & ruang konsul', href: '/jadwal', icon: 'CalendarDays', description: 'Slot terjadwal dan ruang telemedicine.' },
    { id: 'pasien', label: 'Data pasien dibagikan', href: '/pasien', icon: 'FileHeart', description: 'Hasil yang pasien bagikan untukmu.' },
    { id: 'catatan', label: 'Resep & catatan', href: '/catatan', icon: 'NotebookPen', description: 'Catatan dan resep pasca-konsul.' },
    { id: 'pendapatan', label: 'Pendapatan & pencairan', href: '/pendapatan', icon: 'Wallet', description: 'Pendapatan konsultasi dan pencairan.' },
    { id: 'profil', label: 'Profil STR/SIP', href: '/profil', icon: 'IdCard', description: 'Kredensial STR/SIP dan profil praktik.' },
  ],
};

export const adminNav: RoleNav = {
  role: 'admin',
  roleLabel: 'Konsol kepercayaan',
  tagline: 'Operasi, kepatuhan, dan keuangan dalam kendali.',
  items: [
    { id: 'ringkasan', label: 'Ringkasan operasi', href: '/', icon: 'Gauge', description: 'Kondisi platform dalam satu pandang.' },
    { id: 'monitoring', label: 'Monitoring QC', href: '/monitoring', icon: 'MonitorCheck', description: 'Pantau QC, armada, dan mitra.' },
    { id: 'verifikasi', label: 'Verifikasi dokter', href: '/verifikasi', icon: 'ShieldCheck', description: 'Verifikasi STR/SIP dokter.' },
    { id: 'kepatuhan', label: 'Kepatuhan', href: '/kepatuhan', icon: 'FileLock2', description: 'Consent, audit log, dan laporan PDP.' },
    { id: 'keuangan', label: 'Keuangan', href: '/keuangan', icon: 'Banknote', description: 'Keuangan multi-aliran pendapatan.' },
    { id: 'katalog', label: 'Katalog parameter', href: '/katalog', icon: 'ListTree', description: 'Panel, parameter, dan ambang sebagai data.' },
    { id: 'kurasi', label: 'Wellness & voucher', href: '/kurasi', icon: 'Sparkles', description: 'Kurasi program wellness dan mitra brand.', isNew: true },
    { id: 'inspektur', label: 'Inspektur peran', href: '/inspektur', icon: 'Eye', description: 'Lihat sebagai peran lain (read-only).' },
  ],
};
