'use client';
// apps/customer/components/ChatBox.tsx — chat pasien↔dokter per konsultasi.
import React, { useEffect, useRef, useState } from 'react';
import { fetchConsultMessages, sendConsultMessage, type ChatMessage } from '../app/actions';

export function ChatBox({ consultationId }: { consultationId: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() { setMsgs(await fetchConsultMessages(consultationId)); }

  useEffect(() => {
    if (!open) return;
    load();
    const t = setInterval(load, 5000); // polling ringan (near-realtime)
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length]);

  async function send() {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    const r = await sendConsultMessage(consultationId, t);
    if (r.ok) { setText(''); await load(); }
    setBusy(false);
  }

  if (!open) {
    return <button className="btn btn--ghost" style={{ marginTop: 8 }} onClick={() => setOpen(true)}>💬 Buka chat</button>;
  }

  return (
    <div style={{ marginTop: 8, border: '1px solid var(--ava-color-line)', borderRadius: 12, padding: 10 }}>
      <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {msgs.length === 0 ? (
          <div className="hint">Belum ada pesan. Mulai percakapan.</div>
        ) : msgs.map((m) => (
          <div key={m.id} style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
            <div style={{
              padding: '7px 11px', borderRadius: 12, fontSize: 14,
              background: m.mine ? 'var(--brand)' : 'var(--ava-color-surface-100)',
              color: m.mine ? '#fff' : 'var(--ava-color-ink-900)',
            }}>{m.body}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input className="input" placeholder="Tulis pesan…" value={text}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} style={{ flex: 1 }} />
        <button className="btn" disabled={busy || !text.trim()} onClick={send} style={{ width: 'auto' }}>Kirim</button>
      </div>
    </div>
  );
}
