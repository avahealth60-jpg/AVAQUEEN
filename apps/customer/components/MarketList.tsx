'use client';
// apps/customer/components/MarketList.tsx — etalase alat + keranjang multi-item.
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkoutCart } from '../app/actions';
import type { ListingView } from '../lib/market';

const rupiah = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

function ListingCard({ l, qty, onAdd, onDec }: {
  l: ListingView; qty: number; onAdd: () => void; onDec: () => void;
}) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--ava-color-ink-900)' }}>{l.title}</div>
          <div style={{ fontSize: 13, color: 'var(--ava-color-ink-500)' }}>
            {[l.manufacturer, l.category].filter(Boolean).join(' · ') || l.modelName}
          </div>
        </div>
        {l.verified && <span className="pill pill--normal" style={{ whiteSpace: 'nowrap' }}>✓ AVA Verified</span>}
      </div>
      {l.description && <p style={{ fontSize: 13, color: 'var(--ava-color-ink-500)', margin: '8px 0 0' }}>{l.description}</p>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <div style={{ fontWeight: 700, color: 'var(--ava-color-ink-900)' }}>{rupiah(l.price)}</div>
        {l.stock <= 0 ? (
          <span className="pill pill--none">Stok habis</span>
        ) : qty === 0 ? (
          <button className="btn btn--ghost" onClick={onAdd}>Tambah</button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn btn--ghost" onClick={onDec} aria-label="Kurangi">−</button>
            <strong style={{ minWidth: 18, textAlign: 'center' }}>{qty}</strong>
            <button className="btn btn--ghost" onClick={onAdd} disabled={qty >= l.stock} aria-label="Tambah">+</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function MarketList({ items }: { items: ListingView[] }) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);

  const byId = useMemo(() => new Map(items.map((l) => [l.id, l])), [items]);
  const entries = Object.entries(cart).filter(([, q]) => q > 0);
  const count = entries.reduce((s, [, q]) => s + q, 0);
  const total = entries.reduce((s, [id, q]) => s + (byId.get(id)?.price ?? 0) * q, 0);

  function add(id: string) {
    const l = byId.get(id);
    setCart((c) => ({ ...c, [id]: Math.min((c[id] ?? 0) + 1, l?.stock ?? 1) }));
  }
  function dec(id: string) {
    setCart((c) => ({ ...c, [id]: Math.max((c[id] ?? 0) - 1, 0) }));
  }

  async function checkout() {
    setBusy(true); setNote(null);
    const r = await checkoutCart(entries.map(([listingId, qty]) => ({ listingId, qty })));
    setNote({ kind: r.ok ? 'ok' : 'bad', text: r.message });
    if (r.ok) { setCart({}); router.refresh(); }
    setBusy(false);
  }

  if (items.length === 0) {
    return (
      <div className="card">
        <div className="empty"><strong>Belum ada produk</strong>Etalase alat ber-badge akan tampil di sini.</div>
      </div>
    );
  }

  return (
    <>
      <p style={{ fontSize: 13, color: 'var(--ava-color-ink-500)', margin: '0 0 12px' }}>
        Alat bertanda <strong>✓ AVA Verified</strong> didukung badge kalibrasi aktif — kepercayaan yang terbukti, bukan klaim.
      </p>

      {items.map((l) => (
        <ListingCard key={l.id} l={l} qty={cart[l.id] ?? 0} onAdd={() => add(l.id)} onDec={() => dec(l.id)} />
      ))}

      {note && <div className={`note note--${note.kind}`}>{note.text}</div>}

      {count > 0 && (
        <div
          className="card card--brand"
          style={{
            position: 'sticky', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: 'var(--ava-color-ink-900)' }}>{count} item</div>
            <div style={{ fontSize: 13, color: 'var(--ava-color-ink-500)' }}>Total {rupiah(total)}</div>
          </div>
          <button className="btn" disabled={busy} onClick={checkout}>
            {busy ? 'Memproses…' : 'Checkout & bayar'}
          </button>
        </div>
      )}
    </>
  );
}
