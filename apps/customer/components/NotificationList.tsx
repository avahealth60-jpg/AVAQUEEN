'use client';
// apps/customer/components/NotificationList.tsx — kotak masuk notifikasi.
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { markNotificationRead, markAllNotificationsRead } from '../app/actions';
import type { NotificationView } from '../lib/data';

function fmt(ts: string) {
  return new Date(ts).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function NotificationList({ items }: { items: NotificationView[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const hasUnread = items.some((n) => !n.readAt);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    await fn();
    router.refresh();
    setBusy(false);
  }

  if (items.length === 0) {
    return (
      <div className="card">
        <div className="empty"><strong>Belum ada notifikasi</strong>Pengingat & kabar akan muncul di sini.</div>
      </div>
    );
  }

  return (
    <>
      {hasUnread && (
        <button className="btn btn--ghost" disabled={busy} style={{ marginBottom: 12 }}
          onClick={() => run(markAllNotificationsRead)}>
          Tandai semua dibaca
        </button>
      )}
      <div className="card">
        {items.map((n) => (
          <div key={n.id} className="read" style={{ opacity: n.readAt ? 0.6 : 1 }}>
            <div className="read__main">
              <div className="read__label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {!n.readAt && <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--ava-color-trust-600)', display: 'inline-block' }} />}
                {n.title}
              </div>
              <div className="read__meta" style={{ whiteSpace: 'normal' }}>{n.body}</div>
              <div className="read__meta" style={{ fontSize: 11 }}>{fmt(n.createdAt)}</div>
            </div>
            {!n.readAt && (
              <button className="btn btn--ghost" disabled={busy} onClick={() => run(() => markNotificationRead(n.id))}>
                Dibaca
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
