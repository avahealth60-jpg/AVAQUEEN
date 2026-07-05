'use client';
// apps/customer/components/DataPrivacy.tsx — hak data UU PDP: ekspor & hapus akun.
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { exportMyData, deleteMyAccount } from '../app/actions';

export function DataPrivacy() {
  const router = useRouter();
  const [busy, setBusy] = useState<null | 'export' | 'delete'>(null);
  const [confirm, setConfirm] = useState('');
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);

  async function doExport() {
    setBusy('export'); setNote(null);
    const r = await exportMyData();
    if (r.ok && r.data) {
      const blob = new Blob([r.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `ava-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); URL.revokeObjectURL(url);
      setNote({ kind: 'ok', text: 'Data diunduh sebagai JSON.' });
    } else setNote({ kind: 'bad', text: r.message });
    setBusy(null);
  }

  async function doDelete() {
    setBusy('delete'); setNote(null);
    const r = await deleteMyAccount(confirm);
    setNote({ kind: r.ok ? 'ok' : 'bad', text: r.message });
    if (r.ok) { router.refresh(); }
    setBusy(null);
  }

  return (
    <div className="card">
      <div style={{ fontWeight: 600, color: 'var(--ava-color-ink-900)' }}>Data & privasi (UU PDP)</div>
      <p style={{ fontSize: 13, color: 'var(--ava-color-ink-500)', margin: '4px 0 12px' }}>
        Datamu milikmu. Unduh salinan kapan saja, atau hapus permanen.
      </p>
      <button className="btn btn--ghost" onClick={doExport} disabled={busy !== null}>
        {busy === 'export' ? 'Menyiapkan…' : 'Unduh data saya (JSON)'}
      </button>

      <div style={{ marginTop: 12, borderTop: '1px solid var(--ava-color-line)', paddingTop: 12 }}>
        {!open ? (
          <button className="btn btn--ghost" style={{ color: 'var(--segera)' }} onClick={() => setOpen(true)}>
            Hapus akun & semua data
          </button>
        ) : (
          <>
            <div className="hint" style={{ marginBottom: 8 }}>
              Tindakan ini <strong>permanen</strong>. Ketik <strong>HAPUS</strong> untuk konfirmasi.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="HAPUS" style={{ flex: 1 }} />
              <button className="btn" style={{ background: 'var(--segera)', width: 'auto' }} onClick={doDelete} disabled={busy !== null}>
                {busy === 'delete' ? 'Menghapus…' : 'Hapus'}
              </button>
            </div>
          </>
        )}
      </div>
      {note && <div className={`note note--${note.kind}`}>{note.text}</div>}
    </div>
  );
}
