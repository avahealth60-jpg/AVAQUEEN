'use client';
// apps/admin/components/LoginForm.tsx — masuk ke konsol (email + kata sandi).
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError('Email atau kata sandi salah.');
      return;
    }
    router.refresh(); // layout mengevaluasi ulang sesi → konsol terbuka
  }

  return (
    <div className="login">
      <div className="login__mark">A</div>
      <h1 className="login__title">AVA Admin</h1>
      <p className="login__sub">Konsol kepercayaan QC. Masuk untuk melanjutkan.</p>

      <label className="login__label" htmlFor="email">Email</label>
      <input
        id="email" className="login__input" type="email" autoComplete="username"
        value={email} onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && signIn()}
      />

      <label className="login__label" htmlFor="pw">Kata sandi</label>
      <input
        id="pw" className="login__input" type="password" autoComplete="current-password"
        value={password} onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && signIn()}
      />

      {error && <div className="login__error" role="alert">{error}</div>}

      <button className="login__btn" onClick={signIn} disabled={busy || !email || !password}>
        {busy ? 'Memeriksa…' : 'Masuk'}
      </button>
    </div>
  );
}
