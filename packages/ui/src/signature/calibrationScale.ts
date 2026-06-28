/**
 * AVA Health — Motif Tanda Tangan: Skala Kalibrasi (V1.1.0)
 *
 * Elemen visual yang membuat AVA dikenali: penanda nilai pada sebuah skala
 * berketik (seperti alat ukur), dengan pita "rentang normal" yang disorot.
 * Dipakai untuk readout parameter (gula, tekanan darah) DAN status kalibrasi alat.
 *
 * Murni & deterministik: tanpa DOM, tanpa dependency. Mengembalikan string SVG.
 * Posisi penanda selalu di-CLAMP ke dalam track — nilai di luar skala tetap
 * tampil di tepi, tidak pernah keluar bingkai.
 *
 * CATATAN POSISI SaMD: ini lapisan presentasi. Penentuan triase/status tetap
 * deterministik di @ava/domain; di sini kita hanya menggambar hasilnya.
 */

import { palette, triageColor } from '../tokens/colors.js';

export interface CalibrationScaleInput {
  /** Nilai yang ditandai. */
  value: number;
  /** Batas bawah & atas skala tampil. */
  scaleMin: number;
  scaleMax: number;
  /** Pita rentang normal (disorot). Opsional. */
  normalMin?: number;
  normalMax?: number;
  /** Satuan untuk readout (mis. 'mg/dL'). */
  unit?: string;
  /** Status untuk warna penanda; bila kosong, dihitung dari pita normal. */
  status?: 'normal' | 'perhatian' | 'segera';
  /** Dimensi. */
  width?: number;
  height?: number;
  /** Jumlah tick pada track. */
  ticks?: number;
}

export interface CalibrationScaleResult {
  svg: string;
  /** Fraksi 0..1 posisi penanda (berguna untuk tes & layout). */
  markerFraction: number;
  /** Status efektif yang dipakai untuk warna. */
  status: 'normal' | 'perhatian' | 'segera';
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Tentukan status dari pita normal bila tidak diberikan eksplisit. */
function deriveStatus(
  value: number,
  normalMin?: number,
  normalMax?: number,
): 'normal' | 'perhatian' | 'segera' {
  if (normalMin === undefined || normalMax === undefined) return 'normal';
  if (value >= normalMin && value <= normalMax) return 'normal';
  const span = normalMax - normalMin || 1;
  const dist = value < normalMin ? normalMin - value : value - normalMax;
  // Lebih dari setengah lebar pita di luar rentang → "segera"; selebihnya "perhatian".
  return dist > span * 0.5 ? 'segera' : 'perhatian';
}

const fmt = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toFixed(1);

export function calibrationScale(input: CalibrationScaleInput): CalibrationScaleResult {
  const {
    value,
    scaleMin,
    scaleMax,
    normalMin,
    normalMax,
    unit = '',
    width = 320,
    height = 72,
    ticks = 5,
  } = input;

  if (scaleMax <= scaleMin) {
    throw new Error('scaleMax harus lebih besar dari scaleMin');
  }

  const status = input.status ?? deriveStatus(value, normalMin, normalMax);
  const accent = triageColor[status].fg;

  // Geometri track
  const padX = 16;
  const trackY = Math.round(height * 0.62);
  const trackStart = padX;
  const trackEnd = width - padX;
  const trackW = trackEnd - trackStart;

  const toX = (v: number) =>
    trackStart + clamp((v - scaleMin) / (scaleMax - scaleMin), 0, 1) * trackW;

  const markerFraction = clamp((value - scaleMin) / (scaleMax - scaleMin), 0, 1);
  const markerX = trackStart + markerFraction * trackW;

  // Pita normal
  let normalBand = '';
  if (normalMin !== undefined && normalMax !== undefined) {
    const x1 = toX(normalMin);
    const x2 = toX(normalMax);
    normalBand = `<rect x="${x1.toFixed(1)}" y="${trackY - 4}" width="${(x2 - x1).toFixed(1)}" height="8" rx="4" fill="${palette.ok100}"/>`;
  }

  // Tick marks
  const tickEls: string[] = [];
  for (let i = 0; i < ticks; i++) {
    const tx = trackStart + (trackW * i) / (ticks - 1);
    tickEls.push(
      `<line x1="${tx.toFixed(1)}" y1="${trackY + 6}" x2="${tx.toFixed(1)}" y2="${trackY + 11}" stroke="${palette.lineStrong}" stroke-width="1"/>`,
    );
  }

  const valueText = `${fmt(value)}${unit ? ' ' + unit : ''}`;

  const svg = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Skala kalibrasi: ${valueText}">
  <!-- track -->
  <line x1="${trackStart}" y1="${trackY}" x2="${trackEnd}" y2="${trackY}" stroke="${palette.line}" stroke-width="2" stroke-linecap="round"/>
  ${normalBand}
  ${tickEls.join('\n  ')}
  <!-- penanda nilai -->
  <line x1="${markerX.toFixed(1)}" y1="${trackY - 14}" x2="${markerX.toFixed(1)}" y2="${trackY + 4}" stroke="${accent}" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="${markerX.toFixed(1)}" cy="${trackY - 14}" r="4" fill="${accent}"/>
  <!-- readout (mono) -->
  <text x="${trackStart}" y="20" font-family="'JetBrains Mono', ui-monospace, monospace" font-size="18" font-weight="600" fill="${palette.ink900}">${valueText}</text>
  <text x="${trackEnd}" y="20" text-anchor="end" font-family="'JetBrains Mono', ui-monospace, monospace" font-size="11" fill="${accent}">${triageColor[status].label.toUpperCase()}</text>
</svg>`;

  return { svg, markerFraction, status };
}
