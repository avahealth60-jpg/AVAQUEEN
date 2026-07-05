/**
 * AVA Health — Domain Wearable (Fase A: fondasi koneksi smartwatch)
 *
 * Tipe inti untuk NORMALISASI data dari perangkat wearable (Google Health
 * Connect, Apple Health, Fitbit, Garmin, Zepp/Amazfit, Samsung Health) menjadi
 * satu bentuk baku yang bisa disimpan di `health_readings` dan — untuk metrik
 * KLINIS — ditriase oleh mesin deterministik yang sudah ada.
 *
 * PRINSIP (menjaga posisi non-SaMD, KBLI 86910):
 *   1. Metrik KLINIS (detak jantung, SpO₂, suhu, tekanan darah) memakai
 *      `REFERENCE_CATALOG` yang sama dengan input manual → triase deterministik,
 *      dapat diaudit, tidak pernah dari AI.
 *   2. Metrik GAYA HIDUP (langkah, tidur, kalori, HRV) TIDAK ditriase. Ia hanya
 *      bahan bakar tren & program wellness. Secara struktural TIDAK BISA
 *      menghasilkan 'segera' — mencegah alarm palsu & menjaga posisi edukatif.
 */

import type { Triage } from '../types.js';
import type { ReferenceKey } from '../reference-range.js';

/** Sumber data wearable. Dicerminkan ke kolom `health_readings.source`. */
export type WearableSource =
  | 'health_connect' // Android — gerbang utama (Mi Band, Samsung, Oppo, dll)
  | 'apple_health'
  | 'fitbit'
  | 'garmin'
  | 'zepp' // Amazfit / Zepp
  | 'samsung_health'
  | 'manual_wearable'; // dicatat manual dari layar jam (fallback jujur)

export const WEARABLE_SOURCES: readonly WearableSource[] = [
  'health_connect',
  'apple_health',
  'fitbit',
  'garmin',
  'zepp',
  'samsung_health',
  'manual_wearable',
] as const;

/** Jenis metrik: menentukan apakah nilai boleh ditriase. */
export type MetricKind = 'clinical' | 'lifestyle';

/**
 * Definisi satu metrik wearable yang dikenal AVA.
 * `referenceKey` diisi HANYA untuk metrik klinis yang punya rentang teraudit.
 */
export interface WearableMetricSpec {
  /** Kunci kanonik AVA (mis. 'heart_rate'). Disimpan sebagai `reading_type`. */
  readonly key: string;
  readonly label: string;
  /** Satuan kanonik AVA. Nilai masuk dikonversi ke satuan ini bila perlu. */
  readonly unit: string | null;
  readonly kind: MetricKind;
  /** Kunci ke REFERENCE_CATALOG untuk triase. Wajib ada bila kind='clinical'. */
  readonly referenceKey?: ReferenceKey;
  /** Nama metrik dari berbagai provider yang dipetakan ke key kanonik ini. */
  readonly aliases: readonly string[];
}

/** Satu sampel mentah dari perangkat wearable (sebelum normalisasi). */
export interface WearableSample {
  /** Nama metrik apa adanya dari provider (mis. 'HeartRate', 'oxygen_saturation'). */
  readonly metric: string;
  readonly value: number;
  /** Satuan apa adanya dari provider (mis. '°F', 'hours'). Boleh null bila tak bersatuan. */
  readonly unit?: string | null;
  /** Waktu pengambilan (ISO). */
  readonly takenAt: string;
  readonly source: WearableSource;
  /** Model perangkat opsional, untuk jejak audit (mis. 'Amazfit Bip 5'). */
  readonly deviceModel?: string | null;
}

/** Hasil normalisasi — siap disimpan ke `health_readings`. */
export interface NormalizedReading {
  /** Kunci kanonik → `health_readings.reading_type`. */
  readonly readingType: string;
  readonly label: string;
  /** Nilai dalam satuan kanonik AVA. */
  readonly value: number;
  readonly unit: string | null;
  readonly source: WearableSource;
  readonly takenAt: string;
  readonly deviceModel: string | null;
  readonly kind: MetricKind;
  /**
   * Triase deterministik untuk metrik KLINIS.
   * INVARIAN: `null` untuk metrik gaya hidup (tidak pernah ditriase).
   */
  readonly triage: Triage | null;
  /** Alasan singkat edukatif (bukan diagnosis). */
  readonly reason: string;
}

export class WearableNormalizationError extends Error {}
