// apps/customer/app/toko/page.tsx — etalase alat ber-badge AVA Verified.
import React from 'react';
import Link from 'next/link';
import { getCustomerAuth } from '../../lib/auth';
import { listings, myOrders } from '../../lib/market';
import { ConnBanner } from '../../components/ConnBanner';
import { MarketList } from '../../components/MarketList';

export const dynamic = 'force-dynamic';

const rupiah = (n: number) => `Rp${n.toLocaleString('id-ID')}`;
const ORDER_LABEL: Record<string, string> = {
  pending: 'Menunggu bayar', paid: 'Dibayar', shipped: 'Dikirim', delivered: 'Diterima', cancelled: 'Dibatalkan',
};

export default async function TokoPage() {
  const { configured } = await getCustomerAuth();
  if (!configured) return <div className="screen"><ConnBanner /></div>;

  const [items, orders] = await Promise.all([listings(), myOrders()]);

  return (
    <div className="screen">
      <header style={{ marginBottom: 'var(--ava-space-5)' }}>
        <p style={{
          fontFamily: 'var(--ava-font-mono)', fontSize: 'var(--ava-text-xs)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--ava-color-trust-600)', margin: 0,
        }}>
          Toko
        </p>
        <h1 style={{
          fontFamily: 'var(--ava-font-display)', fontSize: 'var(--ava-text-2xl)',
          fontWeight: 600, color: 'var(--ava-color-ink-900)', margin: '4px 0 0',
        }}>
          Alat kesehatan terverifikasi
        </h1>
      </header>

      <MarketList items={items} />

      {orders.length > 0 && (
        <>
          <div className="section-h">Pesananku</div>
          <div className="card">
            {orders.map((o) => (
              <div className="read" key={o.id}>
                <div className="read__main">
                  <div className="read__label">{o.items.map((i) => `${i.title} ×${i.qty}`).join(', ') || 'Pesanan'}</div>
                  <div className="read__meta">{new Date(o.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
                </div>
                <div className="read__val">{rupiah(o.total)}</div>
                <span className="pill pill--normal">{ORDER_LABEL[o.status] ?? o.status}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <p style={{ marginTop: 16 }}>
        <Link className="btn btn--ghost" href="/" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
          Kembali ke beranda
        </Link>
      </p>
    </div>
  );
}
