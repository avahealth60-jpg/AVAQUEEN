/**
 * AVA Health — Logika tautan pendamping (Fase C). Murni & deterministik.
 * Menegakkan aturan transisi status & validasi scope, agar UI/DB tak
 * mengizinkan keadaan mustahil (mis. menghidupkan kembali tautan yang dicabut).
 */

import type { CaregiverScope, CaregiverLinkStatus } from './types.js';
import { CAREGIVER_SCOPES, CaregiverError } from './types.js';

/** Transisi status yang SAH. Selain ini ditolak. */
const ALLOWED: Record<CaregiverLinkStatus, readonly CaregiverLinkStatus[]> = {
  pending: ['active', 'revoked'], // diterima pendamping, atau dibatalkan pasien
  active: ['revoked'], // dicabut (oleh salah satu pihak)
  revoked: [], // final — undang ulang membuat tautan baru
};

export function canTransition(from: CaregiverLinkStatus, to: CaregiverLinkStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

/** Lempar bila transisi tak sah (dipakai sebelum menulis perubahan status). */
export function assertTransition(from: CaregiverLinkStatus, to: CaregiverLinkStatus): void {
  if (!canTransition(from, to)) {
    throw new CaregiverError(`Transisi status pendamping tidak sah: ${from} → ${to}.`);
  }
}

/** Apakah scope tertentu diizinkan oleh daftar scope tautan. */
export function scopeAllows(scopes: readonly CaregiverScope[], scope: CaregiverScope): boolean {
  return scopes.includes(scope);
}

/** Normalisasi & validasi daftar scope (unik, hanya yang dikenal, tidak kosong). */
export function sanitizeScopes(input: readonly string[]): CaregiverScope[] {
  const known = new Set<string>(CAREGIVER_SCOPES);
  const out: CaregiverScope[] = [];
  for (const s of input) {
    if (known.has(s) && !out.includes(s as CaregiverScope)) out.push(s as CaregiverScope);
  }
  if (out.length === 0) {
    throw new CaregiverError('Minimal satu scope harus dipilih untuk berbagi.');
  }
  return out;
}

/**
 * Apakah pendamping (caregiverId) boleh membaca `scope` milik pasien,
 * berdasarkan satu tautan? Aktif + scope cocok + bukan tautan orang lain.
 */
export function canCaregiverRead(
  link: { caregiverId: string | null; status: CaregiverLinkStatus; scopes: readonly CaregiverScope[] },
  viewerId: string,
  scope: CaregiverScope,
): boolean {
  return (
    link.status === 'active' &&
    link.caregiverId === viewerId &&
    scopeAllows(link.scopes, scope)
  );
}
