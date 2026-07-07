'use client';
// apps/partner/components/VendorListings.tsx — kelola etalase (aktif/nonaktif, stok).
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toggleListing, updateListingStock } from '../app/actions';
import type { VendorListing } from '../lib/data';

const rupiah = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

function Row({ l }: { l: VendorListing }) {
  const router = useRouter();
  const [stock, setStock] = useState(String(l.stock));
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>) { setBusy(true); await fn(); router.refresh(); setBusy(false); }

  return (
    <div style={{ borderBottom: '1px solid var(--line)', padding: '10px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 600 }}>{l.title} {l.verified && <span className="pill pill--ok">✓ Verified</span>}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{rupiah(l.price)} · {l.status === 'active' ? 'tayang' : 'disembunyikan'}</div>
        </div>
        <button className="btn btn--ghost" disabled={busy}
          onClick={() => run(() => toggleListing(l.id, l.status !== 'active'))}>
          {l.status === 'active' ? 'Sembunyikan' : 'Tayangkan'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
        <label className="hint">Stok</label>
        <input className="input" style={{ width: 90 }} type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
        <button className="btn btn--ghost" disabled={busy || stock === String(l.stock)}
          onClick={() => run(() => updateListingStock(l.id, Number(stock)))}>Simpan stok</button>
      </div>
    </div>
  );
}

export function VendorListings({ listings }: { listings: VendorListing[] }) {
  if (listings.length === 0) return <div className="hint">Belum ada listing. Tayangkan alat lewat formulir di atas.</div>;
  return <div>{listings.map((l) => <Row key={l.id} l={l} />)}</div>;
}
