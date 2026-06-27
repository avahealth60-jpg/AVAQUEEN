// packages/db/src/server.ts
// Klien SERVER untuk konsol internal (AVA Admin).
//
// ⚠️ KEAMANAN: memakai SERVICE ROLE key — melewati RLS, melihat SEMUA data.
//   - HANYA dipanggil di sisi server (Server Components / route handlers).
//   - Key dibaca dari env server-only (TANPA prefix NEXT_PUBLIC).
//   - Konsol ini WAJIB ditaruh di belakang autentikasi sebelum di-deploy.
//
// Alasan service-role di konsol internal: admin AVA memang harus melihat
// lintas-vendor & lintas-mitra untuk kepatuhan. RLS tetap menjadi firewall
// untuk app customer & partner; konsol internal adalah pengecualian sah.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/**
 * Mengembalikan klien service-role, atau null bila env belum di-set
 * (supaya halaman bisa menampilkan pesan "belum tersambung" alih-alih crash).
 */
export function adminServerClient(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function isConfigured(): boolean {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
