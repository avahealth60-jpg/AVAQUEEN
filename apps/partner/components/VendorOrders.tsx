'use client';
// apps/partner/components/VendorOrders.tsx — pesanan masuk + pemenuhan.
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setOrderStatus } from '../app/actions';
import type { VendorOrder } from '../lib/data';

const rupiah = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const STATUS: Record<string, [string, string]> = {
  pending: ['pill pill--warn', 'Belum bayar'],
  paid: ['pill pill--ok', 'Dibayar'],
  shipped: ['pill pill--ok', 'Dikirim'],
  delivered: ['pill pill--mute', 'Diterima'],
  cancelled: ['pill pill--mute', 'Dibatalkan'],
};

export function VendorOrders({ orders }: { orders: VendorOrder[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(id: string, status: string) {
    setBusy(id + status);
    await setOrderStatus(id, status);
    router.refresh();
    setBusy(null);
  }

  if (orders.length === 0) {
    return <div className="hint">Belum ada pesanan untuk produkmu.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {orders.map((o) => {
        const [cls, label] = STATUS[o.status] ?? ['pill pill--mute', o.status];
        return (
          <div key={o.id} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span className={cls}>{label}</span>
              <strong className="mono">{rupiah(o.total)}</strong>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
              {o.items.map((i) => `${i.title} ×${i.qty}`).join(', ')}
              {' · '}{new Date(o.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {o.status === 'paid' && (
                <button className="btn" disabled={busy !== null} onClick={() => act(o.id, 'shipped')}>
                  {busy === o.id + 'shipped' ? '…' : 'Tandai dikirim'}
                </button>
              )}
              {o.status === 'shipped' && (
                <button className="btn" disabled={busy !== null} onClick={() => act(o.id, 'delivered')}>
                  {busy === o.id + 'delivered' ? '…' : 'Tandai diterima'}
                </button>
              )}
              {(o.status === 'paid' || o.status === 'shipped') && (
                <button className="btn btn--ghost" disabled={busy !== null} onClick={() => act(o.id, 'cancelled')}>Batal</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
