'use client';
// apps/customer/components/WearableConnect.tsx
// Kartu "Hubungkan smartwatch": deteksi jembatan yang tersedia, minta izin,
// catat koneksi (+ consent wearable_sync), lalu sinkron sampel ke server.
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { availableBridges, type WearableBridge } from '../lib/wearable/bridge';
import { connectWearable, disconnectWearable, syncWearableSamples } from '../app/actions';

type Note = { kind: 'ok' | 'bad'; text: string } | null;

function BridgeCard({
  bridge,
  connected,
}: {
  bridge: WearableBridge;
  connected: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | 'connect' | 'sync' | 'disconnect'>(null);
  const [note, setNote] = useState<Note>(null);

  async function handleConnect() {
    setBusy('connect');
    setNote(null);
    try {
      const granted = await bridge.requestPermissions();
      if (!granted) {
        setNote({ kind: 'bad', text: 'Izin akses ditolak di perangkat.' });
        return;
      }
      const r = await connectWearable(bridge.id);
      setNote({ kind: r.ok ? 'ok' : 'bad', text: r.message });
      if (r.ok) router.refresh();
    } catch (e) {
      setNote({ kind: 'bad', text: `Gagal menghubungkan: ${String(e)}` });
    } finally {
      setBusy(null);
    }
  }

  async function handleSync() {
    setBusy('sync');
    setNote(null);
    try {
      const samples = await bridge.readRecent(7);
      if (samples.length === 0) {
        setNote({ kind: 'bad', text: 'Tidak ada data terbaru di perangkat.' });
        return;
      }
      const r = await syncWearableSamples(bridge.id, samples);
      setNote({ kind: r.ok ? 'ok' : 'bad', text: r.message });
      if (r.ok) router.refresh();
    } catch (e) {
      setNote({ kind: 'bad', text: `Gagal sinkron: ${String(e)}` });
    } finally {
      setBusy(null);
    }
  }

  async function handleDisconnect() {
    setBusy('disconnect');
    setNote(null);
    const r = await disconnectWearable(bridge.id);
    setNote({ kind: r.ok ? 'ok' : 'bad', text: r.message });
    if (r.ok) router.refresh();
    setBusy(null);
  }

  return (
    <div className="device" style={{ padding: '14px 0', borderBottom: '1px solid var(--ava-color-line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--ava-color-ink-900)' }}>{bridge.label}</div>
          <div style={{ fontSize: 13, color: 'var(--ava-color-ink-500)' }}>{bridge.hint}</div>
        </div>
        {connected && (
          <span className="pill pill--normal" style={{ whiteSpace: 'nowrap' }}>Tertaut</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {!connected ? (
          <button className="btn" onClick={handleConnect} disabled={busy !== null}>
            {busy === 'connect' ? 'Menghubungkan…' : 'Hubungkan'}
          </button>
        ) : (
          <>
            <button className="btn" onClick={handleSync} disabled={busy !== null}>
              {busy === 'sync' ? 'Menyinkronkan…' : 'Sinkron sekarang'}
            </button>
            <button className="btn btn--ghost" onClick={handleDisconnect} disabled={busy !== null}>
              {busy === 'disconnect' ? 'Melepas…' : 'Lepas'}
            </button>
          </>
        )}
      </div>

      {note && <div className={`note note--${note.kind}`}>{note.text}</div>}
    </div>
  );
}

export function WearableConnect({ connectedProviders }: { connectedProviders: string[] }) {
  const bridges = useMemo(() => availableBridges(), []);
  const nativeAvailable = bridges.some((b) => b.id === 'health_connect');

  return (
    <div className="card">
      <h2 style={{ margin: '0 0 4px', fontSize: 'var(--ava-text-lg)', color: 'var(--ava-color-ink-900)' }}>
        Hubungkan smartwatch
      </h2>
      <p style={{ margin: '0 0 4px', color: 'var(--ava-color-ink-500)', fontSize: 14 }}>
        Tarik langkah, tidur, detak jantung & SpO₂ dari perangkatmu. Datamu tetap
        milikmu — hanya kamu yang bisa melihatnya.
      </p>
      {!nativeAvailable && (
        <p className="note" style={{ fontSize: 13 }}>
          Health Connect (Android) aktif saat aplikasi dibuka lewat AVA versi
          perangkat. Di browser, gunakan mode contoh untuk mencoba alurnya.
        </p>
      )}

      {bridges.map((b) => (
        <BridgeCard key={b.id} bridge={b} connected={connectedProviders.includes(b.id)} />
      ))}
    </div>
  );
}
