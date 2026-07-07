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

// ── Vendor: etalase & pesanan (marketplace) ──────────────────────
export interface VendorListing {
  id: string; title: string; price: number; stock: number; status: string; verified: boolean;
}
export async function vendorListings(): Promise<VendorListing[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('product_listings').select('id, title, price, stock, status')
    .order('created_at', { ascending: false });
  const { data: ver } = await supabase.rpc('verified_listing_ids');
  const verified = new Set<string>(Array.isArray(ver) ? ver.map((v) => (typeof v === 'string' ? v : (v?.verified_listing_ids ?? ''))) : []);
  return ((data ?? []) as { id: string; title: string; price: number; stock: number; status: string }[]).map((l) => ({
    id: l.id, title: l.title, price: Number(l.price), stock: l.stock, status: l.status, verified: verified.has(l.id),
  }));
}

export interface VendorOrder {
  id: string; status: string; total: number; createdAt: string;
  items: { title: string; qty: number; unitPrice: number }[];
}
export async function vendorOrders(): Promise<VendorOrder[]> {
  const supabase = createClient();
  // RLS: vendor hanya melihat order yang memuat itemnya.
  const { data: os } = await supabase
    .from('orders').select('id, status, total, created_at').order('created_at', { ascending: false });
  const orders = (os ?? []) as { id: string; status: string; total: number; created_at: string }[];
  if (orders.length === 0) return [];
  const ids = orders.map((o) => o.id);
  const { data: its } = await supabase
    .from('order_items').select('order_id, title, qty, unit_price').in('order_id', ids); // RLS: item vendor ini saja
  const byOrder = new Map<string, { title: string; qty: number; unitPrice: number }[]>();
  ((its ?? []) as { order_id: string; title: string; qty: number; unit_price: number }[]).forEach((i) => {
    const arr = byOrder.get(i.order_id) ?? [];
    arr.push({ title: i.title, qty: i.qty, unitPrice: Number(i.unit_price) });
    byOrder.set(i.order_id, arr);
  });
  return orders.map((o) => ({
    id: o.id, status: o.status, total: Number(o.total), createdAt: o.created_at, items: byOrder.get(o.id) ?? [],
  }));
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
