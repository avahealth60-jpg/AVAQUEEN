'use client';
// apps/admin/components/SignOutButton.tsx
import React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';

export function SignOutButton({ email }: { email: string | null }) {
  const router = useRouter();
  async function signOut() {
    await createClient().auth.signOut();
    router.refresh();
  }
  return (
    <div className="rail__foot">
      {email && <div className="rail__user" title={email}>{email}</div>}
      <button className="rail__signout" onClick={signOut}>Keluar</button>
    </div>
  );
}
