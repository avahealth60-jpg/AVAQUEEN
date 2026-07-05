'use client';
// apps/customer/components/SubscriptionManager.tsx — pilih/kelola langganan.
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { listPlans, type PlanCode } from '@ava/domain';
import { subscribePremium, cancelSubscription } from '../app/actions';
import type { SubscriptionView } from '../lib/data';

function rupiah(n: number) { return `Rp${n.toLocaleString('id-ID')}`; }
function fmtDate(ts: string | null) {
  return ts ? new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
}

export function SubscriptionManager({
  effective,
  subscription,
}: {
  effective: PlanCode;
  subscription: SubscriptionView | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);
  const plans = listPlans();

  async function run(fn: () => Promise<{ ok: boolean; message: string; redirectUrl?: string | null }>) {
    setBusy(true); setNote(null);
    const r = await fn();
    if (r.ok && r.redirectUrl) { window.location.href = r.redirectUrl; return; }
    setNote({ kind: r.ok ? 'ok' : 'bad', text: r.message });
    if (r.ok) router.refresh();
    setBusy(false);
  }

  return (
    <>
      {plans.map((plan) => {
        const isCurrent = effective === plan.code;
        const isPremium = plan.code === 'premium';
        return (
          <div key={plan.code} className={`card ${isCurrent ? 'card--brand' : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontWeight: 700, fontSize: 'var(--ava-text-lg)', color: 'var(--ava-color-ink-900)' }}>
                {plan.title}
              </div>
              <div style={{ color: 'var(--ava-color-ink-900)', fontWeight: 600 }}>
                {plan.monthlyPrice === 0 ? 'Gratis' : `${rupiah(plan.monthlyPrice)}/bln`}
              </div>
            </div>
            <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: 'var(--ava-color-ink-500)', fontSize: 14 }}>
              {plan.highlights.map((h) => <li key={h} style={{ marginBottom: 4 }}>{h}</li>)}
            </ul>

            {isCurrent ? (
              <div style={{ marginTop: 12 }}>
                <span className="pill pill--normal">Paket kamu saat ini</span>
                {isPremium && subscription?.expiresAt && (
                  <div style={{ fontSize: 13, color: 'var(--ava-color-ink-500)', marginTop: 8 }}>
                    Aktif hingga {fmtDate(subscription.expiresAt)}
                    {subscription.status === 'cancelled' && ' (tidak diperpanjang)'}
                  </div>
                )}
                {isPremium && subscription?.status === 'active' && (
                  <button className="btn btn--ghost" style={{ marginTop: 10 }} disabled={busy}
                    onClick={() => run(cancelSubscription)}>
                    Batalkan perpanjangan
                  </button>
                )}
              </div>
            ) : (
              isPremium && (
                <button className="btn" style={{ marginTop: 12 }} disabled={busy}
                  onClick={() => run(subscribePremium)}>
                  {busy ? 'Memproses…' : 'Berlangganan Premium'}
                </button>
              )
            )}
          </div>
        );
      })}

      {note && <div className={`note note--${note.kind}`}>{note.text}</div>}

      <p style={{ marginTop: 12, fontSize: 12, color: 'var(--ava-color-ink-500)' }}>
        Pembayaran diproses lewat provider (Midtrans/Xendit) saat dikonfigurasi.
        Mode saat ini: contoh (konfirmasi otomatis) untuk mencoba alur.
      </p>
    </>
  );
}
