/**
 * AVA Health — Token Tipografi, Spacing, Radius, Elevasi (V1.1.0)
 *
 * Pilihan tipografi (diturunkan dari brief "instrument-grade"):
 *  - display: Space Grotesk — geometris, sedikit teknikal; dipakai untuk judul, restraint.
 *  - body   : Inter — netral, keterbacaan tinggi untuk teks panjang & UI.
 *  - mono   : JetBrains Mono — BAHASA ANGKA. Semua nilai ukur, parameter, ambang,
 *             serial alat, kode badge memakai mono. Ini motif sekunder yang
 *             membuat AVA terasa seperti alat ukur, bukan formulir.
 *
 * Ketiganya open-source (selaras prinsip standar terbuka — bisa di-self-host,
 * tanpa lock-in ke layanan font berbayar).
 */

export const typography = {
  fontFamily: {
    display: "'Space Grotesk', 'Inter', system-ui, sans-serif",
    body: "'Inter', system-ui, -apple-system, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
  },
  // Skala modular ~1.2 (minor third) — tenang, tidak dramatis.
  fontSize: {
    xs: '0.75rem', // 12 — caption, satuan
    sm: '0.875rem', // 14 — label, teks sekunder
    base: '1rem', // 16 — body
    lg: '1.125rem', // 18
    xl: '1.375rem', // 22 — judul kartu
    '2xl': '1.75rem', // 28 — judul layar
    '3xl': '2.25rem', // 36 — readout besar (nilai ukur)
    '4xl': '3rem', // 48 — angka hero
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.15, // angka/readout
    snug: 1.35, // judul
    normal: 1.6, // body
  },
  letterSpacing: {
    tight: '-0.02em', // display besar
    normal: '0',
    wide: '0.04em', // eyebrow/label kecil huruf kapital
    mono: '0.01em', // mono sedikit lega agar angka mudah dibaca
  },
} as const;

/** Skala spasi 4px — presisi grid alat ukur. */
export const spacing = {
  0: '0',
  1: '0.25rem', // 4
  2: '0.5rem', // 8
  3: '0.75rem', // 12
  4: '1rem', // 16
  5: '1.5rem', // 24
  6: '2rem', // 32
  7: '3rem', // 48
  8: '4rem', // 64
} as const;

/** Radius kecil — kesan presisi/teknikal, bukan playful. */
export const radius = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  full: '9999px',
} as const;

/** Elevasi halus — instrumen tidak melayang berlebihan. */
export const elevation = {
  none: 'none',
  sm: '0 1px 2px rgba(14, 22, 20, 0.06)',
  md: '0 2px 8px rgba(14, 22, 20, 0.08)',
  lg: '0 8px 24px rgba(14, 22, 20, 0.10)',
} as const;

/** Durasi gerak — hemat, menghormati prefers-reduced-motion di layer komponen. */
export const motion = {
  fast: '120ms',
  base: '200ms',
  slow: '320ms',
  ease: 'cubic-bezier(0.2, 0, 0, 1)',
} as const;
