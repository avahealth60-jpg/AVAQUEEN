// apps/partner/lib/auth.ts
// Auth sisi-server untuk portal mitra. Mengembalikan peran + organisasi
// (vendor/lab) si pengguna. Peran yang diizinkan: vendor, lab, faskes_admin,
// doctor. customer/ava_admin tidak boleh di portal mitra.
import { createClient } from './supabase/server';
import type { UserRole } from '@ava/db';

export function authConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export const PARTNER_ROLES: UserRole[] = ['vendor', 'lab', 'faskes_admin', 'doctor'];

export interface PartnerOrg { id: string; name: string; kind: 'vendor' | 'lab' | 'faskes' | 'employer'; }

export interface PartnerAuth {
  configured: boolean;
  email: string | null;
  role: UserRole | null;
  org: PartnerOrg | null;
}

export async function getPartnerAuth(): Promise<PartnerAuth> {
  if (!authConfigured()) return { configured: false, email: null, role: null, org: null };
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { configured: true, email: null, role: null, org: null };

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  const role = (profile?.role ?? null) as UserRole | null;

  // Organisasi pertama tempat user menjadi anggota (vendor/lab umumnya satu).
  let org: PartnerOrg | null = null;
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, organizations(id, name, kind)')
    .eq('profile_id', user.id)
    .limit(1)
    .maybeSingle();
  const o = (membership as { organizations?: PartnerOrg } | null)?.organizations;
  if (o) org = { id: o.id, name: o.name, kind: o.kind };

  return { configured: true, email: user.email ?? null, role, org };
}

export function isPartnerRole(role: UserRole | null): boolean {
  return role !== null && PARTNER_ROLES.includes(role);
}
