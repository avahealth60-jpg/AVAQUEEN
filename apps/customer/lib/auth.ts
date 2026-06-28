// apps/customer/lib/auth.ts — auth consumer (login/daftar mandiri).
import { createClient } from './supabase/server';

export function authConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export interface CustomerAuth { configured: boolean; userId: string | null; email: string | null; }

export async function getCustomerAuth(): Promise<CustomerAuth> {
  if (!authConfigured()) return { configured: false, userId: null, email: null };
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { configured: true, userId: user?.id ?? null, email: user?.email ?? null };
}
