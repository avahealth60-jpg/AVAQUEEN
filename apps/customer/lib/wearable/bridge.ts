// apps/customer/lib/wearable/bridge.ts
//
// Abstraksi "jembatan" ke sumber data wearable di SISI KLIEN. Tujuannya
// memisahkan CARA mengambil sampel (bergantung platform) dari APA yang
// dilakukan dengan sampel (normalisasi + simpan — lihat app/actions.ts).
//
// Health Connect (Android) TIDAK bisa diakses dari browser biasa: ia butuh
// host native (TWA/Capacitor) yang menyuntikkan jembatan JS ke `window`.
// Karena itu:
//   • HealthConnectBridge aktif HANYA bila host native menyuntikkan
//     `window.AvaHealthConnect` — inilah titik sambung untuk shell Android.
//   • DemoBridge selalu tersedia agar alur bisa diuji end-to-end di browser
//     hari ini (menghasilkan contoh sampel beberapa hari terakhir).
import type { WearableSource } from '@ava/domain';

/** Sampel mentah dari perangkat — nama metrik apa adanya (dinormalisasi server). */
export interface RawWearableSample {
  metric: string;
  value: number;
  unit?: string | null;
  takenAt: string; // ISO
  deviceModel?: string | null;
}

export interface WearableBridge {
  id: WearableSource;
  label: string;
  /** Keterangan singkat untuk UI. */
  hint: string;
  /** Tersedia di lingkungan saat ini? (mis. host native menyuntikkan API). */
  isAvailable(): boolean;
  /** Minta izin akses data ke provider. */
  requestPermissions(): Promise<boolean>;
  /** Ambil sampel beberapa hari terakhir. */
  readRecent(days: number): Promise<RawWearableSample[]>;
}

/**
 * Kontrak jembatan native yang WAJIB dipenuhi shell Android (TWA/Capacitor)
 * saat menyuntikkan `window.AvaHealthConnect`. Dijaga tipis & stabil.
 */
export interface NativeHealthConnect {
  requestPermissions(): Promise<boolean>;
  readRecent(days: number): Promise<RawWearableSample[]>;
  deviceModel?(): string | null;
}

declare global {
  interface Window {
    AvaHealthConnect?: NativeHealthConnect;
  }
}

/** Jembatan Health Connect — nyata bila dibungkus host native Android. */
export const healthConnectBridge: WearableBridge = {
  id: 'health_connect',
  label: 'Google Health Connect',
  hint: 'Mi Band, Samsung, Amazfit, Oppo & lainnya (Android)',
  isAvailable() {
    return typeof window !== 'undefined' && typeof window.AvaHealthConnect?.readRecent === 'function';
  },
  async requestPermissions() {
    const api = typeof window !== 'undefined' ? window.AvaHealthConnect : undefined;
    if (!api) return false;
    return api.requestPermissions();
  },
  async readRecent(days: number) {
    const api = typeof window !== 'undefined' ? window.AvaHealthConnect : undefined;
    if (!api) throw new Error('Health Connect tidak tersedia di perangkat ini.');
    return api.readRecent(days);
  },
};

/**
 * Jembatan contoh — untuk demo/uji tanpa perangkat. Menghasilkan sampel
 * realistis beberapa hari terakhir (langkah, tidur, detak istirahat, SpO₂).
 */
export const demoBridge: WearableBridge = {
  id: 'manual_wearable',
  label: 'Contoh (tanpa perangkat)',
  hint: 'Membuat data contoh untuk mencoba alur sinkronisasi',
  isAvailable() {
    return true;
  },
  async requestPermissions() {
    return true;
  },
  async readRecent(days: number) {
    const out: RawWearableSample[] = [];
    const now = Date.now();
    const day = 86_400_000;
    const n = Math.max(1, Math.min(days, 7));
    for (let i = n - 1; i >= 0; i--) {
      const ts = new Date(now - i * day);
      ts.setHours(7, 30, 0, 0);
      const iso = ts.toISOString();
      const jitter = (base: number, spread: number) => Math.round(base + (Math.random() - 0.5) * spread);
      out.push(
        { metric: 'steps', value: jitter(8200, 4000), takenAt: iso, deviceModel: 'Amazfit Bip 5' },
        { metric: 'sleep', value: +(6.5 + Math.random() * 1.8).toFixed(1), unit: 'hours', takenAt: iso, deviceModel: 'Amazfit Bip 5' },
        { metric: 'resting_heart_rate', value: jitter(70, 14), unit: 'bpm', takenAt: iso, deviceModel: 'Amazfit Bip 5' },
        { metric: 'oxygen_saturation', value: jitter(97, 4), unit: '%', takenAt: iso, deviceModel: 'Amazfit Bip 5' },
      );
    }
    return out;
  },
};

/** Semua jembatan yang tersedia sekarang (native diutamakan; demo sbg fallback). */
export function availableBridges(): WearableBridge[] {
  const list: WearableBridge[] = [];
  if (healthConnectBridge.isAvailable()) list.push(healthConnectBridge);
  list.push(demoBridge);
  return list;
}
