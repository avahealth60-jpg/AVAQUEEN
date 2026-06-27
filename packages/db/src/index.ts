import { createClient } from '@supabase/supabase-js';

/** Klien browser: hanya ANON key. RLS yang menegakkan akses. */
export function browserClient(url: string, anonKey: string) {
  return createClient(url, anonKey, { auth: { persistSession: true } });
}
