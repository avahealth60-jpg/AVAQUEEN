'use client';
// apps/customer/components/PushToggle.tsx — aktifkan/matikan notifikasi push.
import React, { useEffect, useState } from 'react';
import { subscribePush, unsubscribePush, pushSupported, VAPID_PUBLIC } from '../lib/push';
import { savePushSubscription, removePushSubscription } from '../app/actions';

export function PushToggle() {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setSupported(pushSupported() && !!VAPID_PUBLIC);
    (async () => {
      if (!pushSupported()) return;
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setOn(!!sub);
    })();
  }, []);

  async function enable() {
    setBusy(true); setNote(null);
    try {
      const sub = await subscribePush();
      if (!sub) { setNote('Izin notifikasi ditolak atau tidak didukung.'); return; }
      const r = await savePushSubscription(sub);
      setNote(r.message); setOn(r.ok);
    } catch (e) { setNote(`Gagal: ${String(e)}`); }
    setBusy(false);
  }

  async function disable() {
    setBusy(true); setNote(null);
    try {
      const endpoint = await unsubscribePush();
      if (endpoint) await removePushSubscription(endpoint);
      setOn(false); setNote('Notifikasi push dimatikan.');
    } catch (e) { setNote(`Gagal: ${String(e)}`); }
    setBusy(false);
  }

  if (!supported) {
    return (
      <div className="card">
        <div style={{ fontWeight: 600, color: 'var(--ava-color-ink-900)' }}>Notifikasi push</div>
        <div className="hint" style={{ marginTop: 4 }}>
          {pushSupported() ? 'Belum dikonfigurasi (VAPID key belum di-set).' : 'Browser ini tidak mendukung push.'}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--ava-color-ink-900)' }}>Notifikasi push</div>
          <div style={{ fontSize: 13, color: 'var(--ava-color-ink-500)' }}>
            {on ? 'Aktif — kamu akan dapat pengingat & alert.' : 'Nyalakan untuk pengingat & alert pendamping.'}
          </div>
        </div>
        <button className="btn btn--ghost" disabled={busy} onClick={on ? disable : enable} style={{ width: 'auto' }}>
          {busy ? '…' : on ? 'Matikan' : 'Nyalakan'}
        </button>
      </div>
      {note && <div className="note note--ok">{note}</div>}
    </div>
  );
}
