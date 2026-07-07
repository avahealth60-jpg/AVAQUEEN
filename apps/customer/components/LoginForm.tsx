'use client';
// apps/customer/components/LoginForm.tsx — masuk / daftar mandiri.
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setErr(null); setOk(null);
    const supabase = createClient();
    if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) { setErr('Email atau kata sandi salah.'); return; }
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setBusy(false);
      if (error) { setErr(error.message); return; }
      if (data.session) { router.refresh(); return; }       // langsung login
      setOk('Akun dibuat. Cek email untuk verifikasi, lalu masuk.'); // bila konfirmasi email aktif
      setMode('in');
    }
  }

  async function forgotPassword() {
    if (!email) { setErr('Isi email dulu untuk reset kata sandi.'); return; }
    setBusy(true); setErr(null); setOk(null);
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/akun` : undefined;
    const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setOk('Tautan reset kata sandi dikirim ke emailmu.');
  }

  async function magicLink() {
    if (!email) { setErr('Isi email dulu untuk tautan masuk.'); return; }
    setBusy(true); setErr(null); setOk(null);
    const emailRedirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { error } = await createClient().auth.signInWithOtp({ email, options: { emailRedirectTo } });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setOk('Tautan masuk dikirim ke emailmu. Buka email untuk lanjut.');
  }

  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__mark">A</div>
        <h1 className="auth__title">{mode === 'in' ? 'Masuk' : 'Buat akun'}</h1>
        <p className="auth__sub">Pantau kesehatanmu — analisis edukatif, datamu milikmu.</p>

        <label className="auth__label" htmlFor="email">Email</label>
        <input id="email" className="auth__input" type="email" autoComplete="username"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="auth__label" htmlFor="pw">Kata sandi</label>
        <input id="pw" className="auth__input" type="password"
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()} />

        {err && <div className="auth__err" role="alert">{err}</div>}
        {ok && <div className="auth__ok" role="status">{ok}</div>}

        <button className="auth__btn" onClick={submit} disabled={busy || !email || !password}>
          {busy ? 'Memproses…' : mode === 'in' ? 'Masuk' : 'Daftar'}
        </button>

        {mode === 'in' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 13, gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={forgotPassword} disabled={busy}
              style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', font: 'inherit', padding: 0 }}>
              Lupa kata sandi?
            </button>
            <button type="button" onClick={magicLink} disabled={busy}
              style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', font: 'inherit', padding: 0 }}>
              Masuk via tautan email
            </button>
          </div>
        )}

        <div className="auth__toggle">
          {mode === 'in' ? (
            <>Belum punya akun? <button onClick={() => { setMode('up'); setErr(null); }}>Daftar</button></>
          ) : (
            <>Sudah punya akun? <button onClick={() => { setMode('in'); setErr(null); }}>Masuk</button></>
          )}
        </div>
      </div>
    </div>
  );
}
