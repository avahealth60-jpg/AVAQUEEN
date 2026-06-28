// apps/partner/lib/data.ts
// Query baca portal mitra — SEMUA lewat klien sesi (anon + JWT pengguna),
// sehingga RLS yang menyaring: vendor hanya alatnya, dst. Bukan service-role.
import { createClient } from './supabase/server';
import { getFleet, type FleetRow, type DeviceModel } from '@ava/db';

/** Armada milik vendor yang login (RLS membatasi ke org-nya). */
export async function vendorFleet(): Promise<FleetRow[]> {
  return getFleet(createClient());
}

export async function deviceModels(): Promise<DeviceModel[]> {
  const supabase = createClient();
  const { data } = await supabase.from('device_models').select('*').order('name');
  return (data ?? []) as DeviceModel[];
}

export interface LabDeviceRow {
  id: string;
  serial: string;
  modelName: string;
  category: string | null;
  intervalMonths: number;
  badgeActive: boolean;
  badgeExpiresAt: string | null;
}

/** Semua alat (untuk antrian kalibrasi lab). Lab boleh baca devices+models+badges. */
export async function labDevices(): Promise<LabDeviceRow[]> {
  const supabase = createClient();
  const [devicesRes, modelsRes, badgesRes] = await Promise.all([
    supabase.from('devices').select('*'),
    supabase.from('device_models').select('*'),
    supabase.from('badges').select('device_id, status, expires_at'),
  ]);
  const models = new Map(((modelsRes.data ?? []) as DeviceModel[]).map((m) => [m.id, m]));
  const badges = (badgesRes.data ?? []) as { device_id: string; status: string; expires_at: string }[];

  return ((devicesRes.data ?? []) as { id: string; serial: string; model_id: string }[]).map((d) => {
    const model = models.get(d.model_id);
    const active = badges
      .filter((b) => b.device_id === d.id && b.status === 'active')
      .sort((a, b) => (a.expires_at > b.expires_at ? -1 : 1))[0];
    return {
      id: d.id,
      serial: d.serial,
      modelName: model?.name ?? '—',
      category: model?.category ?? null,
      intervalMonths: model?.calibration_interval_months ?? 12,
      badgeActive: Boolean(active),
      badgeExpiresAt: active?.expires_at ?? null,
    };
  });
}
