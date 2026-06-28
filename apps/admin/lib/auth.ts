// Helper auth sisi-server: status konfigurasi + user + peran.
import { createClient } from './supabase/server';
import type { UserRole } from '@ava/db';

export function authConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export interface AuthState {
  configured: boolean;
  email: string | null;
  role: UserRole | null;
}

export async function getAuth(): Promise<AuthState> {
  if (!authConfigured()) return { configured: false, email: null, role: null };
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { configured: true, email: null, role: null };
  // RLS "self can read own profile" mengizinkan baca peran sendiri.
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  return {
    configured: true,
    email: user.email ?? null,
    role: (profile?.role ?? null) as UserRole | null,
  };
}
