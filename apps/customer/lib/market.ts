// apps/customer/lib/market.ts — data marketplace sisi masyarakat (RLS).
import { createClient } from './supabase/server';

export interface ListingView {
  id: string;
  title: string;
  description: string | null;
  price: number;
  stock: number;
  modelName: string | null;
  manufacturer: string | null;
  category: string | null;
  verified: boolean;
}

export async function listings(): Promise<ListingView[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('product_listings')
    .select('id, title, description, price, stock, device_models(name, category, manufacturer)')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  // Verifikasi dari badge aktif (fungsi definer, selalu segar).
  const { data: ver } = await supabase.rpc('verified_listing_ids');
  const verified = new Set<string>(
    Array.isArray(ver) ? ver.map((v: unknown) => (typeof v === 'string' ? v : (v as { verified_listing_ids?: string })?.verified_listing_ids ?? '')) : [],
  );

  return ((data ?? []) as any[]).map((l) => {
    const m = Array.isArray(l.device_models) ? l.device_models[0] : l.device_models;
    return {
      id: l.id,
      title: l.title,
      description: l.description,
      price: Number(l.price),
      stock: l.stock,
      modelName: m?.name ?? null,
      manufacturer: m?.manufacturer ?? null,
      category: m?.category ?? null,
      verified: verified.has(l.id),
    };
  });
}

export interface OrderView {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  items: { title: string; qty: number; unitPrice: number }[];
}

export async function myOrders(): Promise<OrderView[]> {
  const supabase = createClient();
  const { data: os } = await supabase
    .from('orders').select('id, status, total, created_at')
    .order('created_at', { ascending: false });
  const orders = (os ?? []) as { id: string; status: string; total: number; created_at: string }[];
  if (orders.length === 0) return [];

  const ids = orders.map((o) => o.id);
  const { data: its } = await supabase
    .from('order_items').select('order_id, title, qty, unit_price').in('order_id', ids);
  const byOrder = new Map<string, { title: string; qty: number; unitPrice: number }[]>();
  ((its ?? []) as any[]).forEach((i) => {
    const arr = byOrder.get(i.order_id) ?? [];
    arr.push({ title: i.title, qty: i.qty, unitPrice: Number(i.unit_price) });
    byOrder.set(i.order_id, arr);
  });

  return orders.map((o) => ({
    id: o.id, status: o.status, total: Number(o.total), createdAt: o.created_at,
    items: byOrder.get(o.id) ?? [],
  }));
}
