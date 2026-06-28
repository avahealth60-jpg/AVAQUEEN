/**
 * AVA Health — Token Warna (V1.1.0)
 * Bahasa visual "instrument-grade": graphite tenang di atas surface terang,
 * aksen hijau-kepercayaan dipakai hemat, status berkode warna untuk triase/QC/badge.
 *
 * Prinsip: warna adalah DATA, bukan dekorasi. Setiap nilai punya peran semantik.
 * Sumber kebenaran tunggal — di-generate ke CSS variables (tokens.css) agar
 * lintas tiga app konsisten (customer · partner · admin).
 */

export const palette = {
  // Graphite ink scale — keterbacaan tinggi, bukan hitam pekat (lebih tenang)
  ink900: '#0E1614', // teks utama / readout
  ink700: '#33403C', // teks sekunder
  ink500: '#5C6B66', // teks tersier / label
  ink300: '#94A39D', // teks nonaktif / placeholder

  // Surface — panel instrumen terang
  surface0: '#FFFFFF',
  surface50: '#F5F8F7',
  surface100: '#EBF0EE',
  line: '#D8E0DD', // garis hairline (presisi, tipis)
  lineStrong: '#BCC7C2',

  // Hijau-kepercayaan (AVA Verified) — dipakai HEMAT, hanya untuk aksi & status sehat
  trust100: '#DCF1E9',
  trust300: '#7FCBB1',
  trust500: '#138A6B', // aksen utama
  trust600: '#0E6E55', // aksen tekan / hover
  trust900: '#063A2C',

  // Status — kalibrasi muted, bukan loud. Triase & QC berbagi semantik.
  // 'normal' / 'lulus'
  ok500: '#138A6B',
  ok100: '#DCF1E9',
  // 'perhatian' / 'perlu_tinjau'
  warn500: '#B7791A',
  warn100: '#F7ECD6',
  // 'segera' / 'gagal'
  alert500: '#B23A2E',
  alert100: '#F6DEDA',
  // netral / kedaluwarsa / nonaktif
  neutral500: '#5C6B66',
  neutral100: '#EBF0EE',
} as const;

export type PaletteKey = keyof typeof palette;

/** Triase edukatif (analysis_results.triage) → token warna. Deterministik. */
export const triageColor = {
  normal: { fg: palette.ok500, bg: palette.ok100, label: 'Normal' },
  perhatian: { fg: palette.warn500, bg: palette.warn100, label: 'Perlu perhatian' },
  segera: { fg: palette.alert500, bg: palette.alert100, label: 'Segera periksa' },
} as const;

export type TriageLevel = keyof typeof triageColor;

/** Hasil QC (qc_results.result) → token warna. Berbagi semantik dengan triase. */
export const qcStatusColor = {
  lulus: { fg: palette.ok500, bg: palette.ok100, label: 'Lulus' },
  perlu_tinjau: { fg: palette.warn500, bg: palette.warn100, label: 'Perlu tinjau' },
  gagal: { fg: palette.alert500, bg: palette.alert100, label: 'Gagal' },
} as const;

export type QcResult = keyof typeof qcStatusColor;

/** Status badge AVA Verified (badges.status) → token warna. */
export const badgeStatusColor = {
  active: { fg: palette.ok500, bg: palette.ok100, label: 'Aktif' },
  expiring: { fg: palette.warn500, bg: palette.warn100, label: 'Menjelang jatuh tempo' },
  expired: { fg: palette.neutral500, bg: palette.neutral100, label: 'Kedaluwarsa' },
} as const;

export type BadgeStatus = keyof typeof badgeStatusColor;

/**
 * Resolver aman: ambil token status dari nilai apa pun.
 * Lempar error pada nilai tak dikenal — gagal cepat lebih baik daripada warna salah
 * pada konteks medis. (Dipakai di layer UI, bukan di keputusan klinis.)
 */
export function resolveTriage(level: string): (typeof triageColor)[TriageLevel] {
  const found = triageColor[level as TriageLevel];
  if (!found) throw new Error(`Triase tak dikenal: "${level}"`);
  return found;
}

export function resolveQc(result: string): (typeof qcStatusColor)[QcResult] {
  const found = qcStatusColor[result as QcResult];
  if (!found) throw new Error(`Hasil QC tak dikenal: "${result}"`);
  return found;
}
