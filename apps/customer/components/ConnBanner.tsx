import React from 'react';
export function ConnBanner() {
  return (
    <div className="banner" role="status">
      <span aria-hidden>⚠️</span>
      <div><strong>Supabase belum tersambung.</strong> Set <code>NEXT_PUBLIC_SUPABASE_URL</code> &{' '}
        <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di <code>apps/customer/.env.local</code>.</div>
    </div>
  );
}
