/**
 * AVA Health — Navigasi index & helper (V1.1.0)
 */
import type { Role, RoleNav } from './types.js';
import { customerNav, vendorNav, labNav, doctorNav, adminNav } from './roles.js';

export * from './types.js';
export * from './roles.js';

export const navByRole: Record<Role, RoleNav> = {
  customer: customerNav,
  vendor: vendorNav,
  lab: labNav,
  doctor: doctorNav,
  admin: adminNav,
};

export const allRoles: Role[] = ['customer', 'vendor', 'lab', 'doctor', 'admin'];

/** Ambil navigasi peran; lempar bila peran tak dikenal (gagal cepat). */
export function getNav(role: string): RoleNav {
  const nav = navByRole[role as Role];
  if (!nav) throw new Error(`Peran tak dikenal: "${role}"`);
  return nav;
}
